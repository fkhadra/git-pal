import { cn } from "cn";
import { Check, Plus, Search, X } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import { useSkillsQuery } from "./data-loader";

function skillId(name: string) {
  return `skill-${name}`;
}

interface Props {
  value: string[];
  onChange: (skills: string[]) => void;
}

export function SkillsField({ value, onChange }: Props) {
  const { data: skills = [], isSuccess } = useSkillsQuery();
  const [filter, setFilter] = useState("");
  const [activeName, setActiveName] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const query = filter.trim().toLowerCase();
  const matching = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query),
  );

  const active = matching.find((s) => s.name === activeName) ?? matching[0];

  const isMissing = (name: string) =>
    isSuccess && !skills.some((s) => s.name === name);

  const toggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter((s) => s !== name));
      return;
    }

    onChange([...value, name]);
  };

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && active) {
      e.preventDefault();
      toggle(active.name);
      return;
    }

    const offset = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    const next = offset && matching[matching.indexOf(active) + offset];
    if (!next) return;

    e.preventDefault();
    setActiveName(next.name);
    document
      .getElementById(skillId(next.name))
      ?.scrollIntoView({ block: "nearest" });
  }

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

      <Popover onOpenChange={() => setFilter("")}>
        <PopoverTrigger
          render={
            <Button type="button" size="xs" variant="outline">
              <Plus />
              Add skill
            </Button>
          }
        />
        <PopoverContent
          align="start"
          initialFocus={searchRef}
          className="w-96 gap-2 p-2"
        >
          <InputGroup>
            <InputGroupAddon align="inline-start">
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              ref={searchRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search skills..."
            />
          </InputGroup>

          <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
            {matching.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">No skills</p>
            )}
            {matching.map((skill) => (
              <button
                key={skill.name}
                id={skillId(skill.name)}
                type="button"
                onMouseEnter={() => setActiveName(skill.name)}
                onClick={() => toggle(skill.name)}
                className={cn(
                  "flex items-start gap-2 rounded-md px-2 py-1.5 text-left focus-visible:outline-none",
                  active?.name === skill.name && "bg-muted",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    !value.includes(skill.name) && "invisible",
                  )}
                />
                <span className="min-w-0">
                  <span className="block font-mono text-sm">{skill.name}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {skill.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
