import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import commands from "~/commands";
import { HARNESS_LABELS, HarnessName } from "~/components/harness";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "~/components/ui/combobox";
import {
  useDefaultModelQuery,
  useHarnessModelQuery,
  useModelsQuery,
} from "~/features/agent/data-loader";
import type { Harness, Model } from "~/models/harness";
import { InputGroupAddon } from "~/components/ui/input-group";
import { Search } from "lucide-react";
import { cn } from "cn";

import { CONTROL_WIDTH, SettingRow } from "./SettingRow";

const HARNESSES = Object.keys(HARNESS_LABELS) as Harness[];

export function HarnessSelect() {
  const [harness, setHarness] = useState(globalThis.settings.harness);

  const save = async (next: Harness) => {
    setHarness(next);
    await commands.updateSetting({ harness: next });
  };

  return (
    <>
      <SettingRow label="Harness">
        <Select value={harness} onValueChange={(v) => save(v as Harness)}>
          <SelectTrigger size="sm" className={CONTROL_WIDTH}>
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
      </SettingRow>
      <ModelSelect harness={harness} />
    </>
  );
}

// Shown when the harness lists no model, it then runs its own default 
const DEFAULT_MODEL_LABEL = "Default";
const LOADING_LABEL = "Loading models…";

function ModelSelect({ harness }: { harness: Harness }) {
  const queryClient = useQueryClient();
  const { data: models = [], isFetching } = useModelsQuery(harness);
  const { data: model } = useHarnessModelQuery(harness);
  const { data: defaultModel } = useDefaultModelQuery(harness);
  const selected = models.find((m) => m.id === model) ?? null;
  const isLoading = isFetching && models.length === 0;
  const disabled = isLoading || models.length === 0

  const modelLabel = (m: Model) =>
    m.id === defaultModel ? `${m.label} (default)` : m.label;

  const save = async (next: string) => {
    const picked = { ...globalThis.settings.models, [harness]: next };

    globalThis.settings.models = picked;
    await commands.updateSetting({ models: picked });
    queryClient.invalidateQueries({ queryKey: ["harness-model"] });
  };

  return (
    <SettingRow label="Model">
      <Combobox
        items={models}
        value={selected}
        itemToStringLabel={(m: Model) => m.label}
        isItemEqualToValue={(a: Model, b: Model) => a.id === b.id}
        onValueChange={(next) => next && save(next.id)}
      >
        <ComboboxTrigger
          render={
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              aria-disabled={disabled}
              className={cn(CONTROL_WIDTH, "justify-between font-normal")}

            />
          }
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {isLoading && <Spinner className="size-3.5 shrink-0" />}
            <span className="truncate">
              {isLoading
                ? LOADING_LABEL
                : selected
                  ? modelLabel(selected)
                  : DEFAULT_MODEL_LABEL}
            </span>
          </span>
        </ComboboxTrigger>
        <ComboboxContent align="end" className="w-72">
          <ComboboxInput showTrigger={false} showClear placeholder="Search models..." >
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </ComboboxInput>
          <ComboboxEmpty>No matching model</ComboboxEmpty>
          <ComboboxList>
            {(m: Model) => (
              <ComboboxItem key={m.id} value={m}>
                {modelLabel(m)}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </SettingRow>
  );
}
