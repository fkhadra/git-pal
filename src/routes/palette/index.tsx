import { createFileRoute } from "@tanstack/react-router";

import { HomePage, homePageLoader } from "~/features/palette";

export const Route = createFileRoute("/palette/")({
	component: HomePage,
	loader: homePageLoader,
});
