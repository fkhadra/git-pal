import { usePrefetchQuery, useSuspenseQuery } from "@tanstack/react-query";

import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/Cmdk";
import type { FindPullRequestsFilter, PullRequest } from "~/models";
import { PullRequestItem } from "./Github";
import { state, useCurrentPage } from "./state";
import { openUrl } from "./utils";

async function queryFn({ queryKey }: { queryKey: string[] }) {
	const filter = queryKey[1] as FindPullRequestsFilter;
	const { data } = await commands.findPullRequests(filter);

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

export function usePreloadPullRequestsQueries() {
	usePrefetchQuery({
		queryKey: ["pull-requests", "reviewRequested"],
		queryFn,
	});

	usePrefetchQuery({
		queryKey: ["pull-requests", "mentionned"],
		queryFn,
	});
}

function usePullRequestsQuery() {
	const page = useCurrentPage("pull-requests");

	return useSuspenseQuery({
		queryKey: ["pull-requests", page.params.filter],
		queryFn,
	});
}

export function PullRequestsPage() {
	const { data } = usePullRequestsQuery();

	if (!data) return;

	return (
		<>
			{Object.keys(data).map((key) => (
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
			))}
		</>
	);
}
