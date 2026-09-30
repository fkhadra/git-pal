import { useSuspenseQuery } from "@tanstack/react-query";
import { Bot, Palette } from "lucide-react";

import commands from "~/commands";
import { ThemePicker } from "~/components/theme-picker";

import { AutoStart } from "./AutoStart";
import { AvatarPicker } from "./AvatarPicker";
import { HarnessSelect } from "./HarnessSelect";
import { Section } from "./Section";

export function GeneralSection() {
  const {
    data: { autoStartEnabled },
  } = useSettingsQuery();

  return (
    <>
      <AutoStart autoStartEnabled={autoStartEnabled} />
      <Section icon={Palette} title="Theme">
        <ThemePicker />
        <p className="mt-2 text-xs text-muted-foreground">
          Applies to the review window.
        </p>
      </Section>
      <Section icon={Bot} title="Agent">
        <HarnessSelect />
        <AvatarPicker />
      </Section>
    </>
  );
}

function useSettingsQuery() {
  return useSuspenseQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      return {
        autoStartEnabled: await commands.isAutoStartEnabled(),
      };
    },
  });
}
