import { cn } from "cn";
import { useState } from "react";

import commands from "~/commands";
import { useAppContext } from "~/features/shared";
import type { settings } from "~/models";

const THEMES: { value: settings.Theme; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "dracula", label: "Dracula" },
  { value: "catppuccinMocha", label: "Catppuccin Mocha" },
  { value: "catppuccinLatte", label: "Catppuccin Latte" },
  { value: "andromeda", label: "Andromeda" },
];

/** Miniature window drawn with the theme's own tokens. */
function ThemePreview({ theme }: { theme: string }) {
  return (
    <span
      data-theme={theme}
      className="flex h-12 w-full overflow-hidden rounded-md bg-background"
    >
      <span className="w-1/3 bg-sidebar" />
      <span className="flex flex-1 flex-col justify-center gap-1 p-1.5">
        <span className="h-1.5 w-3/4 rounded-full bg-foreground/70" />
        <span className="flex gap-1">
          <span className="size-1.5 rounded-full bg-primary" />
          <span className="size-1.5 rounded-full bg-success" />
          <span className="size-1.5 rounded-full bg-destructive" />
        </span>
      </span>
    </span>
  );
}

export function ThemePicker() {
  const appContext = useAppContext();
  const [selectedTheme, setTheme] = useState(appContext.settings.theme);

  return (
    <fieldset>
      <legend className="sr-only">Select a theme</legend>

      <div className="grid grid-cols-4 gap-2">
        {THEMES.map(({ value, label }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer flex-col gap-1.5 rounded-lg border-2 border-transparent p-1 text-center text-xs text-muted-foreground hover:border-border",
              value === selectedTheme && "border-primary text-foreground",
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name="theme"
              value={value}
              checked={value === selectedTheme}
              onChange={() => {
                setTheme(value);
                commands.updateSetting({ theme: value });
              }}
            />
            {value === "system" ? (
              <span className="flex overflow-hidden rounded-md">
                <ThemePreview theme="light" />
                <ThemePreview theme="dark" />
              </span>
            ) : (
              <ThemePreview theme={value} />
            )}
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
