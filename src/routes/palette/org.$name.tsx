import { createFileRoute } from "@tanstack/react-router";

import { SkeletonRows } from "~/components";
import { OrgPage, orgPageLoader } from "~/features/palette";

type SearchParams = {
	query?: string;
};

export const Route = createFileRoute("/palette/org/$name")({
	validateSearch(params: Record<string, unknown>): SearchParams {
		return {
			query: params.query as SearchParams["query"],
		};
	},
	loaderDeps({ search: { query } }) {
		return { query };
	},
	loader: orgPageLoader,
	component: OrgPage,
	pendingComponent: () => <SkeletonRows hideRightPart />,
});
