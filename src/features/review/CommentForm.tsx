import { MessageSquare, X } from "lucide-react";
import { useState } from "react";

import { RichTextEditor } from "~/components/rich-text-editor";
import { Button } from "~/components/ui/button";

import { useMentionSearch } from "./data-loader";

interface CommentFormProps {
  label: string;
  defaultValue?: string;
  submitLabel?: string;
  onChange?: (comment: string) => void;
  onSubmit: (comment: string) => void;
  onCancel: () => void;
}

export function CommentForm({
  label,
  defaultValue,
  submitLabel = "Comment",
  onChange,
  onSubmit,
  onCancel,
}: CommentFormProps) {
  const [value, setValue] = useState(defaultValue ?? "");
  const searchMentions = useMentionSearch();

  function change(text: string) {
    setValue(text);
    onChange?.(text);
  }

  function submit() {
    const text = value.trim();
    if (text) onSubmit(text);
  }

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <div className="mx-3 my-2 rounded-lg border bg-card p-3 shadow-sm focus-within:border-primary/50">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-agent">
          <MessageSquare className="size-3.5" />
          <span className="font-medium">{label}</span>
          <button
            type="button"
            onClick={onCancel}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
        <RichTextEditor
          autoFocus
          defaultValue={defaultValue}
          searchMentions={searchMentions}
          placeholder="Write a comment..."
          className="min-h-14 rounded-md bg-muted/50 px-2 py-1.5 text-foreground"
          onChange={change}
          onSubmit={submit}
          onCancel={onCancel}
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="submit" size="xs" variant="default">
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
