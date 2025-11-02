import { createFileRoute } from "@tanstack/react-router";
import { SkeletonRows } from "~/components";
import { PullRequestsPage, pullRequestsPageLoader } from "~/features/palette";
import { FindPullRequestsFilter } from "~/models";

export const Route = createFileRoute("/palette/pull-requests")({
	validateSearch(p) {
		return {
			filter: p.filter as FindPullRequestsFilter,
		};
	},
	loaderDeps: ({ search }) => ({ filter: search.filter }),
	loader: pullRequestsPageLoader,
	component: PullRequestsPage,
	pendingComponent: SkeletonRows,
});
