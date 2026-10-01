import { useCommandState } from "cmdk";
import { FileText, Sparkles } from "lucide-react";

import { CommandGroup, CommandItem } from "~/components/ui/command";
import {
  useBuiltInInstructionsQuery,
  useResolvedTemplateQuery,
  useTemplatesQuery,
} from "~/features/templates/data-loader";
import type { TemplateChoice } from "~/models/code-review";

import { Page } from "./Github";
import { state, useCurrentPage } from "./state";
import { reviewPullRequest } from "./utils";

const AUTO_VALUE = "template-auto";
const BUILT_IN_VALUE = "template-built-in";

/** Lets the user pick the template of the review started with ⌘⇧↵. */
export function ReviewTemplatePage() {
  const { params } = useCurrentPage("review-template");
  const { data: templates = [] } = useTemplatesQuery();
  const { data: builtIn = "" } = useBuiltInInstructionsQuery();
  const highlighted = useCommandState((s) => s.value);
  const { data: resolved } = useResolvedTemplateQuery(
    params.owner,
    params.repository,
    params.prNumber,
  );

  const review = (template: TemplateChoice) => {
    state.goBack();
    reviewPullRequest({ ...params }, template);
  };

  const preview = () => {
    if (highlighted === AUTO_VALUE) return resolved?.content ?? builtIn;

    const template = templates.find((t) => `template-${t.id}` === highlighted);
    return template?.content ?? builtIn;
  };

  return (
    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
      <CommandGroup heading="Review with">
        <CommandItem
          value={AUTO_VALUE}
          keywords={["auto", resolved?.name ?? "built-in"]}
          onSelect={() => review({ type: "auto" })}
        >
          <Page icon={<Sparkles className="text-agent" />}>
            Auto
            <span className="ml-2 text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground/80">
              {resolved?.name ?? "Built-in"}
            </span>
          </Page>
        </CommandItem>
        {templates.map((template) => (
          <CommandItem
            key={template.id}
            value={`template-${template.id}`}
            keywords={[template.name]}
            onSelect={() => review({ type: "template", id: template.id })}
          >
            <Page icon={<FileText className="text-info" />}>
              {template.name}
            </Page>
          </CommandItem>
        ))}
        <CommandItem
          value={BUILT_IN_VALUE}
          keywords={["built-in"]}
          onSelect={() => review({ type: "builtIn" })}
        >
          <Page icon={<FileText className="text-muted-foreground" />}>
            Built-in
          </Page>
        </CommandItem>
      </CommandGroup>
      <pre className="sticky top-0 my-2 h-[calc(var(--full-height)-1rem)] self-start overflow-y-auto rounded-lg border bg-sidebar/60 p-3 font-mono text-xs whitespace-pre-wrap text-muted-foreground">
        {preview()}
      </pre>
    </div>
  );
}
