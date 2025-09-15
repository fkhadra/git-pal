import {
  createFileRoute,
  useLoaderData,
  useNavigate,
} from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";

import {
  CircleDot,
  Github,
  GitPullRequestArrow,
  MessageCircleMore,
} from "lucide-react";
import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/Cmdk";
import { useUserProfile } from "~/contexts/user-profile";
import {
  OrganizationItem,
  Page,
  PullRequestItem,
  RepositoryItem,
} from "~/features/palette/Github";
import { nil } from "~/libs/utils";
import { Store } from "~/store";

export const Route = createFileRoute("/palette/")({
  component: RouteComponent,
  async loader() {
    const { data } = await commands.homepage();

    queueMicrotask(() => {
      data.viewer.pullRequests.nodes?.forEach((pr) => {
        if (pr) Store.set(pr.id, { kind: "pr", data: pr });
      });

      data.viewer.topRepositories.nodes?.forEach((repo) => {
        if (repo) Store.set(repo.id, { kind: "repo", data: repo });
      });
    });

    return data;
  },
});

function RouteComponent() {
  const userProfile = useUserProfile();
  const navigate = useNavigate();
  const data = useLoaderData({ from: "/palette/" });

  return (
    <>
      <CommandGroup heading="Reviews">
        <CommandItem
          value="page-review-requested"
          keywords={["review", "request"]}
          onSelect={() => {
            navigate({
              to: "/palette/pull-requests",
              search: {
                filter: "review-requested",
              },
            });
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
            navigate({
              to: "/palette/pull-requests",
              search: {
                filter: "mentions",
              },
            });
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
          <Page icon={<Github />}>Dashboard</Page>
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
        {data.viewer.pullRequests.nodes?.filter(nil).map((v) => (
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
          {userProfile.organizations.nodes!.filter(nil).map((v) => {
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
        {data.viewer.topRepositories?.nodes?.filter(nil).map((v) => (
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
