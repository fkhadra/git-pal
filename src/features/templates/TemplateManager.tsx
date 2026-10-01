import { cn } from "cn";
import { GripVertical, Plus } from "lucide-react";
import { Reorder, useDragControls } from "motion/react";
import { useState } from "react";
import { toast } from "react-toastify";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import type { ReviewTemplate } from "~/models/code-review";

import {
  useBuiltInInstructionsQuery,
  useDeleteTemplateMutation,
  useReorderTemplatesMutation,
  useTemplatesQuery,
} from "./data-loader";
import { templateManager, useTemplateManagerSnapshot } from "./store";
import { TemplateForm } from "./TemplateForm";

// stable while loading, a fresh `[]` each render would resync the order forever
const NO_TEMPLATES: ReviewTemplate[] = [];

/** Selected template id, `new` while creating one */
type Selection = number | "new";

function TemplateRow({
  template,
  selected,
  onSelect,
  onDragEnd,
}: {
  template: ReviewTemplate;
  selected: boolean;
  onSelect: () => void;
  onDragEnd: () => void;
}) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      value={template}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className={cn(
        "group relative flex items-center gap-1 rounded-md bg-popover px-1 py-1.5 hover:bg-muted/60",
        selected && "bg-accent hover:bg-accent",
      )}
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab touch-none p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 active:cursor-grabbing"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm">{template.name}</span>
          {template.isDefault && (
            <span className="shrink-0 rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">
              Default
            </span>
          )}
        </span>
        {template.matcher && (
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {template.matcher}
          </span>
        )}
      </button>
    </Reorder.Item>
  );
}

function DeleteDialog({
  template,
  onOpenChange,
  onDeleted,
}: {
  template?: ReviewTemplate;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}) {
  const { mutateAsync } = useDeleteTemplateMutation();

  const remove = async () => {
    if (!template) return;

    try {
      await mutateAsync(template.id);
      onDeleted();
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <AlertDialog open={!!template} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete template</AlertDialogTitle>
          <AlertDialogDescription>
            <strong>{template?.name}</strong> will be permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={remove}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Lists, orders and edits review templates. */
export function TemplateManager() {
  const { isManagerOpen } = useTemplateManagerSnapshot();
  const { data: templates = NO_TEMPLATES } = useTemplatesQuery();
  const { data: builtIn } = useBuiltInInstructionsQuery();
  const { mutate: reorder } = useReorderTemplatesMutation();
  const [selection, setSelection] = useState<Selection>();
  const [toDelete, setToDelete] = useState<ReviewTemplate>();

  // local order while dragging, persisted once the item is dropped
  const [items, setItems] = useState(templates);
  const [synced, setSynced] = useState(templates);
  if (templates !== synced) {
    setSynced(templates);
    setItems(templates);
  }

  const selected =
    selection === "new"
      ? undefined
      : (templates.find((t) => t.id === selection) ?? templates[0]);
  const isCreating = selection === "new" || templates.length === 0;

  function persistOrder() {
    const ids = items.map((t) => t.id);
    const unchanged = ids.every((id, i) => id === templates[i]?.id);
    if (!unchanged) reorder(ids);
  }

  return (
    <Dialog open={isManagerOpen} onOpenChange={templateManager.setOpen}>
      <DialogContent className="flex h-[80vh] w-5xl flex-col">
        <DialogHeader>
          <DialogTitle>Review templates</DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr] gap-4">
          <div className="flex min-h-0 flex-col gap-2 border-r pr-4">
            <Reorder.Group
              axis="y"
              values={items}
              onReorder={setItems}
              className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto"
            >
              {items.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  selected={!isCreating && selected?.id === template.id}
                  onSelect={() => setSelection(template.id)}
                  onDragEnd={persistOrder}
                />
              ))}
            </Reorder.Group>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelection("new")}
            >
              <Plus />
              New template
            </Button>
          </div>

          <TemplateForm
            key={isCreating ? "new" : selected?.id}
            template={isCreating ? undefined : selected}
            initialContent={builtIn}
            onSaved={(template) => setSelection(template.id)}
            onDelete={
              isCreating || !selected ? undefined : () => setToDelete(selected)
            }
          />
        </div>

        <DeleteDialog
          template={toDelete}
          onOpenChange={(open) => !open && setToDelete(undefined)}
          onDeleted={() => {
            setToDelete(undefined);
            setSelection(undefined);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
