import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CircleDot,
  GitPullRequestArrow,
  MessageCircleMore,
} from "lucide-react";
import commands from "~/commands";
import GithubLogo from "./github.svg";

import { CommandGroup, CommandItem } from "~/components/Cmdk";
import {
  OrganizationItem,
  Page,
  PullRequestItem,
  RepositoryItem,
} from "~/features/palette/Github";
import { nil } from "~/libs/utils";
import { useAppContext } from "../shared";
import { state } from "./state";
import { openUrl } from "./utils";

function useHomePageQuery() {
  return useSuspenseQuery({
    queryKey: ["homepage"],
    queryFn: async () => {
      const { data } = await commands.homepage();

      queueMicrotask(() => {
        data?.viewer.pullRequests.nodes?.forEach((pr) => {
          if (pr) state.setItem(pr.id, { kind: "pr", data: pr });
        });

        data?.viewer.topRepositories.nodes?.forEach((repo) => {
          if (repo) state.setItem(repo.id, { kind: "repo", data: repo });
        });
      });

      return data;
    },
  });
}

export function HomePage() {
  const { userProfile } = useAppContext();
  const { data } = useHomePageQuery();

  return (
    <>
      <CommandGroup heading="Reviews">
        <CommandItem
          value="page-review-requested"
          keywords={["review", "request"]}
          onSelect={() => {
            state.goTo(
              {
                to: "pull-requests",
                params: {
                  filter: "reviewRequested",
                },
              },
              "Review Requested",
            );
          }}
        >
          <Page icon={<GitPullRequestArrow className="text-blue-500" />}>
            Review Requested
          </Page>
        </CommandItem>
        <CommandItem
          value="page-mentioned"
          keywords={["mention", "review", "request"]}
          onSelect={() => {
            state.goTo(
              {
                to: "pull-requests",
                params: {
                  filter: "mentionned",
                },
              },
              "Mentioned",
            );
          }}
        >
          <Page icon={<MessageCircleMore className="text-pink-400" />}>
            Mentioned
          </Page>
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Pages">
        <CommandItem
          value="dashboard"
          keywords={["dashboard", "home"]}
          onSelect={() => {
            openUrl("http://github.com");
          }}
        >
          <Page
            icon={<img src={GithubLogo} className="size-8" alt="github logo" />}
          >
            Dashboard
          </Page>
        </CommandItem>
        <CommandItem
          value="issues"
          keywords={["issues"]}
          onSelect={() => {
            openUrl("http://github.com/issues");
          }}
        >
          <Page icon={<CircleDot className="text-warning" />}>Issues</Page>
        </CommandItem>
      </CommandGroup>
      <CommandGroup heading="Open Pull Requests">
        {data?.viewer.pullRequests.nodes?.filter(nil).map((v) => (
          <CommandItem
            value={v.id}
            key={v.id}
            keywords={[v.title, "pull request", "pr"]}
            onSelect={() => {
              openUrl(v.url);
            }}
          >
            <PullRequestItem pullRequest={v} hideAvatar />
          </CommandItem>
        ))}
      </CommandGroup>
      {!!userProfile.organizations.nodes?.length && (
        <CommandGroup heading="Organizations">
          {userProfile.organizations.nodes.filter(nil).map((v) => {
            return (
              <CommandItem
                value={v.name || v.login}
                key={v.login}
                keywords={[v.name || v.login, "organizations"]}
                onSelect={() => {
                  openUrl(v.url);
                }}
              >
                <OrganizationItem organization={v} />
              </CommandItem>
            );
          })}
        </CommandGroup>
      )}
      <CommandGroup heading="Repositories">
        {data?.viewer.topRepositories?.nodes?.filter(nil).map((v) => (
          <CommandItem
            value={v.id}
            key={v.id}
            keywords={[v.name, "repository", v.owner.login]}
            onSelect={() => {
              openUrl(v.url);
            }}
          >
            <RepositoryItem repository={v} />
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  );
}
