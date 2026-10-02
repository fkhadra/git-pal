import { cn } from "cn";
import { X } from "lucide-react";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "~/components/ui/combobox";
import type { Skill } from "~/models/harness";

import { useSkillsQuery } from "./data-loader";

function matches(skill: Skill, query: string) {
  const text = `${skill.name} ${skill.description}`.toLowerCase();

  return text.includes(query.trim().toLowerCase());
}

interface Props {
  value: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsField({ value, onChange }: Props) {
  const { data: skills = [], isSuccess, isLoading } = useSkillsQuery();

  const isMissing = (name: string) =>
    isSuccess && !skills.some((s) => s.name === name);
  const selected = skills.filter((skill) => value.includes(skill.name));
  // kept when picking others, they can only be removed from their chip
  const missing = value.filter(isMissing);

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((s) => s !== name));
      return;
    }

    onChange([...value, name]);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.map((name) => (
        <span
          key={name}
          title={isMissing(name) ? "Not installed, reviews skip it" : undefined}
          className={cn(
            "flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs",
            isMissing(name) && "border-warning text-warning",
          )}
        >
          {name}
          <button
            type="button"
            title={`Remove ${name}`}
            className="text-muted-foreground hover:text-foreground"
            onClick={() => toggle(name)}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}

      <Combobox
        multiple
        items={skills}
        value={selected}
        itemToStringLabel={(skill: Skill) => skill.name}
        isItemEqualToValue={(a: Skill, b: Skill) => a.name === b.name}
        filter={(skill: Skill, query) => matches(skill, query)}
        onValueChange={(next: Skill[]) =>
          onChange([...missing, ...next.map((skill) => skill.name)])
        }
      >
        <ComboboxTrigger
          render={<Button type="button" size="xs" variant="outline" />}
        >
          Add skill
        </ComboboxTrigger>
        <ComboboxContent className="w-96">
          <ComboboxInput showTrigger={false} placeholder="Search skills..." />
          <ComboboxEmpty>
            {isLoading ? <Spinner className="size-4" /> : "No skills"}
          </ComboboxEmpty>
          <ComboboxList>
            {(skill: Skill) => (
              <ComboboxItem
                key={skill.name}
                value={skill}
                className="items-start"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-sm">{skill.name}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {skill.description}
                  </span>
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
