import { useState } from "react";

import commands from "~/commands";
import { ShortcutRecorder } from "~/components/shortcut-recorder";

import { useDefaultSettings, useGlobalShortcut } from "./data-loader";

export function GlobalShortcut() {
  const { data: shortcut, refetch } = useGlobalShortcut();
  const defaults = useDefaultSettings();
  const [error, setError] = useState<string>();

  const save = async (value: string) => {
    try {
      await commands.replaceGlobalShortcut(value);
      setError(undefined);
      refetch();
    } catch (error) {
      setError(`Unable to save shortcut: ${error}`);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="flex-1 text-muted-foreground">Show Git Pal</span>
        <ShortcutRecorder
          className="w-44"
          value={shortcut ?? ""}
          defaultValue={defaults?.keybind.showPalette}
          onChange={save}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
