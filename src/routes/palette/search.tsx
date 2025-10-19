import { createFileRoute } from "@tanstack/react-router";
import { SearchPage } from "~/features/palette";

type SearchParams = {
	owner: string;
	repo?: string;
};

export const Route = createFileRoute("/palette/search")({
	validateSearch(params: Record<string, unknown>): SearchParams {
		return {
			owner: params.owner as SearchParams["owner"],
			repo: params.repo as SearchParams["repo"],
		};
	},
	component: SearchPage,
});
