import { useState } from "react";

import commands from "~/commands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { Harness } from "~/models/harness";

// TODO: sync with the BE so we have a single source of truth 
const HARNESS_LABELS: Record<Harness, string> = {
  claude: "Claude Code",
};

const HARNESSES = Object.keys(HARNESS_LABELS) as Harness[];

export function HarnessSelect() {
  const [harness, setHarness] = useState(globalThis.settings.harness);

  const save = async (next: Harness) => {
    setHarness(next);
    await commands.updateSetting({ harness: next });
  };

  return (
    <div className="mb-4 flex items-center gap-2 text-sm">
      <span className="flex-1 text-muted-foreground">
        Harness used by reviews and new conversations
      </span>
      <Select value={harness} onValueChange={(v) => save(v as Harness)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue>{HARNESS_LABELS[harness]}</SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {HARNESSES.map((h) => (
            <SelectItem key={h} value={h}>
              {HARNESS_LABELS[h]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
