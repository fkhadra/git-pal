import { ShortcutKeys } from "~/components/shortcut-keys";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

import { SHORTCUT_LABELS, type ShortcutAction, useKeybind } from "./shortcuts";

const ACTIONS = Object.keys(SHORTCUT_LABELS) as ShortcutAction[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShortcutsDialog({ open, onOpenChange }: Props) {
  const keybind = useKeybind();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {ACTIONS.map((action) => (
            <li key={action} className="flex items-center justify-between">
              <span className="text-muted-foreground">
                {SHORTCUT_LABELS[action]}
              </span>
              <ShortcutKeys shortcut={keybind[action]} />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
