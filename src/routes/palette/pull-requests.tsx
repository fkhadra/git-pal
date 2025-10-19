import { createFileRoute } from "@tanstack/react-router";
import { SkeletonRows } from "~/components";
import { PullRequestsPage, pullRequestsPageLoader } from "~/features/palette";

export const Route = createFileRoute("/palette/pull-requests")({
	validateSearch(p) {
		return {
			filter: p.filter as "review-requested" | "mentions",
		};
	},
	loaderDeps: ({ search }) => ({ filter: search.filter }),
	loader: pullRequestsPageLoader,
	component: PullRequestsPage,
	pendingComponent: SkeletonRows,
});
