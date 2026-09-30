import commands from "~/commands";
import {
  PALETTE_SHORTCUT_LABELS,
  usePaletteKeybind,
  usePaletteKeybindSync,
} from "~/features/palette/shortcuts";

import { useDefaultSettings } from "./data-loader";
import { KeybindList } from "./KeybindList";

export function PaletteShortcuts() {
  const keybind = usePaletteKeybind();
  const defaults = useDefaultSettings()?.keybind.palette;

  usePaletteKeybindSync();

  // the search input keeps the focus, so keys without modifier are fine
  return (
    <KeybindList
      title="Palette"
      labels={PALETTE_SHORTCUT_LABELS}
      keybind={keybind}
      defaults={defaults}
      allowBareKeys
      onSave={(next) => commands.updateSetting({ paletteKeybind: next })}
    />
  );
}
