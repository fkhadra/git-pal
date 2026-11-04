import { ShieldCheck, ShieldOff } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { PolicySource } from "~/models/code-review";

const POLICY_LABELS: Record<PolicySource, string> = {
  repository: "Repository policy",
  overridden: "Overriding repository policy",
};

const POLICY_HINTS: Record<PolicySource, string> = {
  repository: "Auto review and approval follow the repository's git-pal.yml",
  overridden: "The template ignores the repository's git-pal.yml",
};

export function PolicyBadge({ source }: { source: PolicySource | null }) {
  if (!source) return null;

  const Icon = source === "overridden" ? ShieldOff : ShieldCheck;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="flex shrink-0 items-center gap-1 text-xs font-normal whitespace-nowrap text-muted-foreground">
            <Icon className="size-4" />
            {POLICY_LABELS[source]}
          </span>
        }
      />
      <TooltipContent>{POLICY_HINTS[source]}</TooltipContent>
    </Tooltip>
  );
}
