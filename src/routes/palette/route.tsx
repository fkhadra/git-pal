import { createFileRoute } from "@tanstack/react-router";
import { PalettePage } from "~/features/palette";

interface SearchParams {
	p?: string;
	r?: string;
}

export const Route = createFileRoute("/palette")({
	component: PalettePage,
	validateSearch(p): SearchParams {
		return {
			p: p.p as string,
			r: p.r as string,
		};
	},
});
