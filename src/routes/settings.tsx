import { createFileRoute } from "@tanstack/react-router";
import { Keyboard, Palette, Power } from "lucide-react";
import { FormControl, Input, Label, Switch } from "~/components/Form";
import { Keybind } from "~/components/Keybind";
import { ThemePicker } from "~/components/ThemePicker";
import { Typography } from "~/components/Typography";

export const Route = createFileRoute("/settings")({
  component() {
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
            <ThemePicker />
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
