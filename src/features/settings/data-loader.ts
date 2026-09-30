import { useQuery } from "@tanstack/react-query";

import commands from "~/commands";

export function useDefaultSettings() {
  return useQuery({
    queryKey: ["default-settings"],
    queryFn: commands.defaultSettings,
    staleTime: Infinity,
  }).data;
}

export function useGlobalShortcut() {
  return useQuery({
    queryKey: ["settings", "global-shortcut"],
    queryFn: async () => (await commands.getSettings()).keybind.showPalette,
  });
}
