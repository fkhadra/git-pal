import { useEffect } from "react";
import { proxy, useSnapshot } from "valtio";

import commands from "~/commands";
import { captureShortcut, shortcutToString } from "~/libs/keymap";
import type { ReviewKeybind } from "~/models/settings";

export type ShortcutAction = keyof ReviewKeybind;

export const SHORTCUT_LABELS: Record<ShortcutAction, string> = {
  toggleReviews: "Hide/Show reviews",
  previousFile: "Previous file",
  nextFile: "Next file",
  refresh: "Check for updates",
  toggleViewType: "Split/Unified view",
  toggleSubmit: "Submit review",
  openPullRequest: "Open on GitHub",
  toggleAgent: "Agent",
  showShortcuts: "Keyboard shortcuts",
  findInDiff: "Find in file",
  findFile: "Search files",
};

const keybind = proxy<ReviewKeybind>({ ...globalThis.settings.keybind.review });

export function useKeybind() {
  return useSnapshot(keybind);
}

export function useKeybindSync() {
  useEffect(() => {
    const listener = commands.onSettingChanged((event) => {
      const value = event.payload.settingChanged;
      if ("reviewKeybind" in value) Object.assign(keybind, value.reviewKeybind);
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, []);
}

export function matchShortcut(event: KeyboardEvent) {
  const pressed = shortcutToString(captureShortcut(event));
  const actions = Object.keys(keybind) as ShortcutAction[];

  return actions.find((action) => keybind[action] === pressed);
}
