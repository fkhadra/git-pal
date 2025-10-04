import { createFileRoute } from "@tanstack/react-router";
import { SetupPage } from "~/features/setup";

export const Route = createFileRoute("/setup")({
  component: SetupPage,
});
