import { createFileRoute, useLoaderData } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import commands from "~/commands";
import { SkeletonRows } from "~/components";
import { CommandGroup, CommandItem } from "~/components/Cmdk";
import { PullRequestItem } from "~/features/palette/Github";
import type { PullRequest } from "~/models";
import { state } from "~/store";

export const Route = createFileRoute("/palette/pull-requests")({
	component: RouteComponent,
	validateSearch(p) {
		return {
			filter: p.filter as "review-requested" | "mentions",
		};
	},
	pendingComponent: SkeletonRows,
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
				state.setItem(pr.id, { kind: "pr", data: pr });
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
				<CommandItem
					value={v.id}
					key={v.id}
					keywords={[v.title, v.repository.name]}
					onSelect={() => {
						openUrl(v.url);
					}}
				>
					<PullRequestItem pullRequest={v} />
				</CommandItem>
			))}
		</CommandGroup>
	));
}
