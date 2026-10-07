import { Bot } from "lucide-react";

import { HarnessSelect } from "./HarnessSelect";
import { Section } from "./Section";

export function AgentSection() {
  return (
    <Section
      icon={Bot}
      title="Agent"
      description="Used by reviews and new conversations."
    >
      <HarnessSelect />
    </Section>
  );
}
