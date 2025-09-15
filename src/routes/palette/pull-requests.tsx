import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/Cmdk";
import { PullRequestItem } from "~/features/palette/Github";
import { PullRequest } from "~/models";
import { Store } from "~/store";

export const Route = createFileRoute("/palette/pull-requests")({
  component: RouteComponent,
  validateSearch(p) {
    return {
      filter: p.filter as "review-requested" | "mentions",
    };
  },
  loaderDeps: ({ search }) => ({ filter: search.filter }),
  async loader({ deps }) {
    const { data } = await commands.searchPullRequests(deps.filter);

    const groups: Record<string, PullRequest[]> = {};
    const pullRequests =
      data?.search.nodes?.filter((v) => v?.__typename === "PullRequest") || [];

    pullRequests.forEach((pr) => {
      groups[pr.repository.name] = groups[pr.repository.name] || [];
      groups[pr.repository.name].push(pr);
    });

    queueMicrotask(() => {
      pullRequests.forEach((pr) => {
        Store.set(pr.id, { kind: "pr", data: pr });
      });
    });

    return groups;
  },
});

function RouteComponent() {
  const data = useLoaderData({ from: "/palette/pull-requests" });

  if (!data) return;

  return Object.keys(data).map((key) => (
    <CommandGroup key={key} heading={key}>
      {data[key].map((v) => (
        <CommandItem value={v.id} keywords={[v.title, v.repository.name]}>
          <PullRequestItem pullRequest={v} />
        </CommandItem>
      ))}
    </CommandGroup>
  ));
}
