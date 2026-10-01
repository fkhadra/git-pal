import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import commands from "~/commands";
import { HARNESS_LABELS, HarnessName } from "~/components/harness";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  useHarnessModelQuery,
  useModelsQuery,
} from "~/features/agent/data-loader";
import type { Harness } from "~/models/harness";

const HARNESSES = Object.keys(HARNESS_LABELS) as Harness[];

export function HarnessSelect() {
  const [harness, setHarness] = useState(globalThis.settings.harness);

  const save = async (next: Harness) => {
    setHarness(next);
    await commands.updateSetting({ harness: next });
  };

  return (
    <>
      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="flex-1 text-muted-foreground">
          Harness used by reviews and new conversations
        </span>
        <Select value={harness} onValueChange={(v) => save(v as Harness)}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue>
              <HarnessName harness={harness} />
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {HARNESSES.map((h) => (
              <SelectItem key={h} value={h}>
                <HarnessName harness={h} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ModelSelect harness={harness} />
    </>
  );
}

function ModelSelect({ harness }: { harness: Harness }) {
  const queryClient = useQueryClient();
  const { data: models = [] } = useModelsQuery(harness);
  const { data: model } = useHarnessModelQuery(harness);

  const save = async (next: string) => {
    const picked = { ...globalThis.settings.models, [harness]: next };

    globalThis.settings.models = picked;
    await commands.updateSetting({ models: picked });
    queryClient.invalidateQueries({ queryKey: ["harness-model"] });
  };

  return (
    <div className="mb-4 flex items-center gap-2 text-sm">
      <span className="flex-1 text-muted-foreground">
        Model used by reviews and new conversations
      </span>
      <Select value={model ?? ""} onValueChange={(v) => save(v as string)}>
        <SelectTrigger size="sm" className="w-44">
          <SelectValue>
            {models.find((m) => m.id === model)?.label ?? model}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {models.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
