import { MonitorCog, Moon, Sun } from "lucide-react";
import { useState } from "react";

type Themes = "light" | "dark" | "system";

export function ThemePicker() {
  const [theme, setTheme] = useState<Themes>(() => {
    return (localStorage.getItem("theme") as Themes) || "system";
  });

  return (
    <fieldset>
      <legend className="sr-only">Select a theme</legend>

      <div className="grid grid-cols-3 gap-4">
        {["light", "dark", "system"].map((v) => (
          <label
            key={v}
            htmlFor={v}
            className="has-checked:border-primary hover:has-checked:border-primary dark:bg-input bg-background has-checked:bg-primary/15 cursor-pointer rounded-md border-2 border-gray-300 p-4 hover:border-slate-400 dark:border-gray-500 dark:hover:border-slate-50"
          >
            <input
              type="radio"
              className="peer absolute appearance-none"
              id={v}
              value={v}
              onChange={(e) => {
                if (e.target.checked) {
                  switch (v) {
                    case "light":
                      document.documentElement.classList.toggle("dark", false);
                      localStorage.setItem("theme", "light");
                      break;
                    case "dark":
                      document.documentElement.classList.toggle("dark", true);
                      localStorage.setItem("theme", "dark");
                      break;
                    case "system":
                    default:
                      document.documentElement.classList.toggle(
                        "dark",
                        window.matchMedia("(prefers-color-scheme: dark)")
                          .matches,
                      );
                      localStorage.removeItem("theme");
                      break;
                  }

                  setTheme(v as Themes);
                }
              }}
              checked={v === theme}
            />
            <div className="peer-checked:text-primary flex flex-col items-center gap-2 text-center capitalize">
              {v === "light" && <Sun />}
              {v === "dark" && <Moon />}
              {v === "system" && <MonitorCog />}
              <span>{v}</span>
            </div>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
