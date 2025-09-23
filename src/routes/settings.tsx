import { createFileRoute } from "@tanstack/react-router";
import { Keyboard, MonitorCog, Moon, Palette, Power, Sun } from "lucide-react";
import { useState } from "react";
import { FormControl, Input, Label, Switch } from "~/components/Form";
import { Keybind } from "~/components/Keybind";
import { Typography } from "~/components/Typography";

export const Route = createFileRoute("/settings")({
  component() {
    const [theme, setTheme] = useState("light");

    return (
      <section id="setting-page" className="flex h-dvh flex-col p-4">
        <div className="flex h-full flex-col gap-7">
          <section>
            <Typography.h4 className="mb-2 flex items-center">
              <Power className="mr-2" />
              Startup
            </Typography.h4>
            <FormControl className="flex-row items-center">
              <Label className="font-normal">
                Automatically start Git Pal when you login
              </Label>
              <Switch className="ml-auto" />
            </FormControl>
          </section>
          <div className="h-[1px] bg-fuchsia-500/10" />
          <section>
            <Typography.h4 className="mb-2 flex items-center">
              <Palette className="mr-2" />
              Theme
            </Typography.h4>
            <fieldset>
              <legend className="sr-only">Select a theme</legend>

              <div className="grid grid-cols-3 gap-4">
                {["light", "dark", "auto"].map((v) => (
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
                          if (v === "light") {
                            document.documentElement.classList.toggle(
                              "dark",
                              false,
                            );
                          } else if (v === "dark") {
                            document.documentElement.classList.toggle(
                              "dark",
                              true,
                            );
                          } else {
                            document.documentElement.classList.toggle(
                              "dark",
                              localStorage.theme === "dark" ||
                                (!("theme" in localStorage) &&
                                  window.matchMedia(
                                    "(prefers-color-scheme: dark)",
                                  ).matches),
                            );
                          }

                          setTheme(v);
                        }
                      }}
                      checked={v === theme}
                    />
                    <div className="peer-checked:text-primary flex flex-col items-center gap-2 text-center capitalize">
                      {v === "light" && <Sun />}
                      {v === "dark" && <Moon />}
                      {v === "auto" && <MonitorCog />}
                      <span>{v}</span>
                    </div>
                  </label>
                ))}
              </div>
            </fieldset>
          </section>
          <div className="h-[1px] bg-pink-400/10" />
          <section>
            <Typography.h4 className="mb-2 flex items-center">
              <Keyboard className="mr-2" />
              Shortcut
            </Typography.h4>
            <div className="flex items-center">
              <Keybind
                label="Global shortcut to open Git Pal"
                keys={["⌘", "G"]}
              />
              <div className="ml-auto">
                <Input placeholder="⌘G" />
              </div>
            </div>
          </section>
        </div>
      </section>
    );
  },
});
