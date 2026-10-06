import { useEffect } from "react";
import { proxy, useSnapshot } from "valtio";

import commands from "~/commands";
import type { PaletteKeybind } from "~/models/settings";

export type PaletteAction = keyof PaletteKeybind;

export const PALETTE_SHORTCUT_LABELS: Record<PaletteAction, string> = {
  primaryAction: "Open or view pull request",
  secondaryAction: "Browse organization, or open on GitHub",
  actions: "Show actions",
  review: "Review",
  reviewWithTemplate: "Review with template",
  codeSearch: "Code search",
  help: "Help",
  goBack: "Go back",
  cancel: "Cancel",
};

export const paletteKeybind = proxy<PaletteKeybind>({
  ...globalThis.settings.keybind.palette,
});

export function usePaletteKeybind() {
  return useSnapshot(paletteKeybind);
}

/** Applies keybind edits made in the settings window. */
export function usePaletteKeybindSync() {
  useEffect(() => {
    const listener = commands.onSettingChanged((event) => {
      const value = event.payload.settingChanged;
      if ("paletteKeybind" in value) {
        Object.assign(paletteKeybind, value.paletteKeybind);
      }
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, []);
}
