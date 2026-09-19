import { MonitorCog, Moon, Sun } from "lucide-react";
import { useState } from "react";

import commands from "~/commands";
import { useAppContext } from "~/features/shared";
import { themeSwitcher } from "~/libs/utils";
import type { settings } from "~/models";

const themes: settings.Theme[] = ["light", "dark", "system"];

export function ThemePicker() {
  const appContext = useAppContext();
  const [selectedTheme, setTheme] = useState(appContext.settings.theme);

  return (
    <fieldset>
      <legend className="sr-only">Select a theme</legend>

      <div className="grid grid-cols-3 gap-4">
        {themes.map((theme) => (
          <label
            key={theme}
            htmlFor={theme}
            className="cursor-pointer rounded-md border-2 border-gray-300 bg-background p-4 hover:border-slate-400 has-checked:border-primary has-checked:bg-primary/15 hover:has-checked:border-primary dark:border-gray-500 dark:bg-input dark:hover:border-slate-50"
          >
            <input
              type="radio"
              className="peer absolute appearance-none"
              id={theme}
              value={theme}
              onChange={(e) => {
                if (e.target.checked) {
                  themeSwitcher(theme);
                  setTheme(theme);
                  commands.updateSetting({
                    theme,
                  });
                }
              }}
              checked={theme === selectedTheme}
            />
            <div className="flex flex-col items-center gap-2 text-center capitalize peer-checked:text-primary">
              {theme === "light" && <Sun />}
              {theme === "dark" && <Moon />}
              {theme === "system" && <MonitorCog />}
              <span>{theme}</span>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
