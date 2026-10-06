import { useSuspenseQuery } from "@tanstack/react-query";
import { GitPullRequestArrow } from "lucide-react";
import { useDeferredValue, useEffect } from "react";

import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/ui/command";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

import { PullRequestItem } from "./Github";
import { state, useCurrentPage, useStateSnaphot } from "./state";
import { githubQuery } from "./useAuthorSuggestions";
import { viewPullRequest } from "./utils";

function useRepositoryPullRequestsQuery() {
  const { params } = useCurrentPage("repository-pull-requests");
  const snapshot = useStateSnaphot();
  // keeps the previous results on screen while the next search loads
  const query = useDeferredValue(githubQuery(snapshot.authors, snapshot.query));

  return useSuspenseQuery({
    queryKey: [
      "repository-pull-requests",
      params.owner,
      params.repository,
      query,
    ],
    queryFn: async () => {
      const { data } = await commands.findRepositoryPullRequests({
        owner: params.owner,
        repository: params.repository,
        query,
      });
      const pullRequests =
        data?.search.nodes?.filter((v) => v?.__typename === "PullRequest") ??
        [];

      queueMicrotask(() => {
        pullRequests.forEach((pr) => {
          state.setItem(pr.id, { kind: "pr", data: pr });
        });
      });

      return pullRequests;
    },
  });
}

function NoAuthorResults() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GitPullRequestArrow />
        </EmptyMedia>
        <EmptyTitle>No open pull requests</EmptyTitle>
      </EmptyHeader>
    </Empty>
  );
}

export function RepositoryPullRequestsPage() {
  const { data } = useRepositoryPullRequestsQuery();
  const { authors } = useStateSnaphot();
  const isEmptyAuthorFilter = authors.length > 0 && data.length === 0;

  // replaces the generic "No results found"
  useEffect(() => {
    if (!isEmptyAuthorFilter) return;

    state.disableEmptySearchResults = true;
    return () => {
      state.disableEmptySearchResults = false;
    };
  }, [isEmptyAuthorFilter]);

  if (isEmptyAuthorFilter) {
    return <NoAuthorResults />;
  }

  return (
    <CommandGroup heading="Open Pull Requests">
      {data.map((v) => (
        <CommandItem
          value={v.id}
          key={v.id}
          onSelect={() => {
            viewPullRequest(v);
          }}
        >
          <PullRequestItem pullRequest={v} />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}
