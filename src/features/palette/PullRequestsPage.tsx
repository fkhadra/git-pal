import { useLoaderData } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";

import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/Cmdk";
import type { PullRequest, FindPullRequestsFilter } from "~/models";

import { PullRequestItem } from "./Github";
import { state } from "./state";

type Params = {
	deps: {
		filter: FindPullRequestsFilter;
	};
};

export async function pullRequestsPageLoader({ deps }: Params) {
	const { data } = await commands.findPullRequests(deps.filter);

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
}

export function PullRequestsPage() {
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
