import { createFileRoute } from "@tanstack/react-router";
import commands from "~/commands";
import { SettingsPage } from "~/features/settings";

export const Route = createFileRoute("/settings")({
  async loader() {
    return {
      autoStartEnabled: await commands.isAutoStartEnabled(),
    };
  },

  component: SettingsPage,
});
