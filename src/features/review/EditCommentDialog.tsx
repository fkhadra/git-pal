import { useState } from "react";

import { RichTextEditor } from "~/components/rich-text-editor";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Kbd } from "~/components/ui/kbd";

import { useMentionSearch } from "./data-loader";

interface Props {
  open: boolean;
  title: string;
  defaultValue: string;
  onOpenChange: (open: boolean) => void;
  onSave: (text: string) => void;
}

export function EditCommentDialog({
  open,
  title,
  defaultValue,
  onOpenChange,
  onSave,
}: Props) {
  const [text, setText] = useState(defaultValue);
  const [wasOpen, setWasOpen] = useState(open);
  const searchMentions = useMentionSearch();

  // start from the current comment each time the dialog opens
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setText(defaultValue);
  }

  const canSave = !!text.trim() && text !== defaultValue;

  function save() {
    if (!canSave) return;

    onSave(text.trim());
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <RichTextEditor
          autoFocus
          defaultValue={defaultValue}
          searchMentions={searchMentions}
          className="max-h-[60vh] min-h-64 overflow-y-auto rounded-md border px-3 py-2"
          onChange={setText}
          onSubmit={save}
        />
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSave} onClick={save}>
            Save <Kbd>⌘↵</Kbd>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
