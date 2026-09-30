import { SendHorizontal } from "lucide-react";

import { Button } from "~/components/ui/button";

const PROMPTS = [
  "Explain these changes.",
  "Identify potential risks from this change.",
  "Help me review this pull request.",
];

export function SuggestedPrompts({
  disabled,
  onSelect,
}: {
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-start gap-2 p-3">
      <span className="text-xs font-medium text-muted-foreground">
        Ask about the pull request:
      </span>
      {PROMPTS.map((prompt) => (
        <Button
          key={prompt}
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
        >
          <SendHorizontal />
          {prompt}
        </Button>
      ))}
    </div>
  );
}
