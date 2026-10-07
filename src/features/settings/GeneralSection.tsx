import { useSuspenseQuery } from "@tanstack/react-query";
import { Power } from "lucide-react";

import commands from "~/commands";

import { AgentSection } from "./AgentSection";
import { AutoStart } from "./AutoStart";
import { MonitoringSection } from "./MonitoringSection";
import { Section } from "./Section";

export function GeneralSection() {
  const {
    data: { autoStartEnabled },
  } = useSettingsQuery();

  return (
    <>
      <Section icon={Power} title="Startup">
        <AutoStart autoStartEnabled={autoStartEnabled} />
      </Section>
      <AgentSection />
      <MonitoringSection />
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
