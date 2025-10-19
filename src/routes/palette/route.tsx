import { createFileRoute } from "@tanstack/react-router";
import { PalettePage } from "~/features/palette";

export const Route = createFileRoute("/palette")({
	component: PalettePage,
	validateSearch(p): { p?: string | undefined } {
		return {
			p: p.p as string,
		};
	},
});
