import commands from "~/commands";
import {
  SHORTCUT_LABELS,
  useKeybind,
  useKeybindSync,
} from "~/features/review/shortcuts";

import { useDefaultSettings } from "./data-loader";
import { KeybindList } from "./KeybindList";

export function ReviewShortcuts() {
  const keybind = useKeybind();
  const defaults = useDefaultSettings()?.keybind.review;

  useKeybindSync();

  return (
    <KeybindList
      title="Review window"
      labels={SHORTCUT_LABELS}
      keybind={keybind}
      defaults={defaults}
      onSave={(next) => commands.updateSetting({ reviewKeybind: next })}
    />
  );
}
