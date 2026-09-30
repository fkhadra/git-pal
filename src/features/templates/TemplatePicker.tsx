import { cn } from "cn";
import { LayoutTemplate, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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
import type { TemplateChoice } from "~/models/code-review";

import {
  useBuiltInInstructionsQuery,
  useResolvedTemplateQuery,
  useTemplatesQuery,
} from "./data-loader";

const BUILT_IN_KEY = "built-in";

interface Entry {
  key: string;
  name: string;
  content: string;
  skills: string[];
  choice: TemplateChoice;
  isDefault: boolean;
  isAuto: boolean;
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">
      {children}
    </span>
  );
}

interface Props {
  /** Repository to review, used to flag the template picked automatically */
  owner?: string;
  repository?: string;
  prNumber?: number;
  variant?: "default" | "secondary";
  size?: "xs" | "sm";
  disabled?: boolean;
  /** Controlled open state, e.g. when opened from a menu */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Positions against this element and drops the picker's own button */
  anchor?: React.RefObject<HTMLElement | null>;
  onSelect: (choice: TemplateChoice) => void;
}

export function TemplatePicker({
  owner,
  repository,
  prNumber,
  variant = "default",
  size = "sm",
  disabled,
  open: controlledOpen,
  onOpenChange,
  anchor,
  onSelect,
}: Props) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const searchRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const { data: templates = [] } = useTemplatesQuery();
  const { data: builtIn = "" } = useBuiltInInstructionsQuery();
  const resolved = useResolvedTemplateQuery(owner, repository, prNumber);

  const entries = useMemo(() => {
    const autoId = resolved.isSuccess ? (resolved.data?.id ?? null) : undefined;

    const list: Entry[] = templates.map((t) => ({
      key: String(t.id),
      name: t.name,
      content: t.content,
      skills: t.skills,
      choice: { type: "template", id: t.id },
      isDefault: t.isDefault,
      isAuto: autoId === t.id,
    }));

    list.push({
      key: BUILT_IN_KEY,
      name: "Built-in",
      content: builtIn,
      skills: [],
      choice: { type: "builtIn" },
      isDefault: false,
      isAuto: autoId === null,
    });

    const query = filter.trim().toLowerCase();
    return list.filter((e) => e.name.toLowerCase().includes(query));
  }, [templates, builtIn, resolved.isSuccess, resolved.data, filter]);

  const active = entries.find((e) => e.key === activeKey) ?? entries[0];

  function select(entry: Entry) {
    setOpen(false);
    setFilter("");
    onSelect(entry.choice);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const index = entries.indexOf(active);

    if (e.key === "Enter" && active) {
      e.preventDefault();
      select(active);
      return;
    }

    const offset = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    const next = offset && entries[index + offset];
    if (!next) return;

    e.preventDefault();
    setActiveKey(next.key);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {!anchor && (
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant={variant}
              className="px-2"
              size={size}
              disabled={disabled}
              title="Review with a template"
            >
              <LayoutTemplate />
            </Button>
          }
        />
      )}
      <PopoverContent
        align="start"
        anchor={anchor}
        initialFocus={searchRef}
        className="flex w-160 flex-col gap-2 p-2"
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
            placeholder="Search templates..."
          />
        </InputGroup>

        <div className="grid h-72 grid-cols-[200px_1fr] gap-2">
          <div className="flex flex-col gap-0.5 overflow-y-auto border-r pr-2">
            {entries.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">No templates</p>
            )}
            {entries.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onMouseEnter={() => setActiveKey(entry.key)}
                onFocus={() => setActiveKey(entry.key)}
                onClick={() => select(entry)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm",
                  active?.key === entry.key && "bg-muted",
                )}
              >
                <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                {entry.isAuto && <Badge>Auto</Badge>}
                {entry.isDefault && <Badge>Default</Badge>}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-col gap-2">
            {active && active.skills.length > 0 && (
              <p className="font-mono text-xs">
                Skills: {active.skills.join(", ")}
              </p>
            )}
            <pre className="overflow-y-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">
              {active?.content}
            </pre>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
