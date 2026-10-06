import { format } from "date-fns";

import { HarnessLogo, reviewedBy } from "~/components/harness";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { useModelsQuery } from "~/features/agent/data-loader";
import { useTemplatesQuery } from "~/features/templates/data-loader";
import type { ReviewTemplate, TemplateChoice } from "~/models/code-review";
import type { Harness } from "~/models/harness";

function templateName(
  choice: TemplateChoice | null,
  templates: ReviewTemplate[],
) {
  if (!choice || choice.type === "auto") return "Automatic";
  if (choice.type === "builtIn") return "Built-in";

  return templates.find((t) => t.id === choice.id)?.name ?? "Deleted template";
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate">{value}</dd>
    </>
  );
}

interface Props {
  harness: Harness;
  model: string | null;
  template: TemplateChoice | null;
  reviewedAt: string;
}

// e.g. "Apr 29, 2026, 3:04 PM"
const DATE_FORMAT = "PPp";

// mounted with the popup, models can be listed over the network
function ReviewDetails({ harness, model, template, reviewedAt }: Props) {
  const { data: models = [] } = useModelsQuery(harness);
  const { data: templates = [] } = useTemplatesQuery();
  const modelLabel = models.find((m) => m.id === model)?.label ?? model;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <span className="flex items-center gap-2 font-medium">
        <HarnessLogo harness={harness} className="size-4" />
        {reviewedBy(harness, null)}
      </span>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
        <Row label="Model" value={modelLabel ?? "Default"} />
        <Row label="Template" value={templateName(template, templates)} />
        <Row label="Date" value={format(new Date(reviewedAt), DATE_FORMAT)} />
      </dl>
    </div>
  );
}

export function ReviewDetailsButton(props: Props) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Review details">
            <HarnessLogo harness={props.harness} className="size-4" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-64">
        <ReviewDetails {...props} />
      </PopoverContent>
    </Popover>
  );
}
