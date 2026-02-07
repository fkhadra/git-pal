import { useSuspenseQuery } from "@tanstack/react-query";
import { Keyboard } from "lucide-react";
import commands from "~/commands";
import { AutoStart } from "./AutoStart";
import { GlobalShortcut } from "./GlobalShortcut";
import { Section } from "./Section";

export function GeneralSection() {
  const {
    data: { autoStartEnabled },
  } = useSettingsQuery();

  return (
    <>
      <AutoStart autoStartEnabled={autoStartEnabled} />
      {/* <Hr /> */}
      {/* <Section icon={Palette} title="Theme">
        <ThemePicker />
      </Section> */}
      {/* <Hr /> */}
      <Section icon={Keyboard} title="Shortcut">
        <GlobalShortcut />
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
