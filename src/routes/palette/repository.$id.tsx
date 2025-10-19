import { createFileRoute } from "@tanstack/react-router";
import { RepositoryPage, repositoryPageLoader } from "~/features/palette";

export const Route = createFileRoute("/palette/repository/$id")({
	loader: repositoryPageLoader,
	component: RepositoryPage,
});
