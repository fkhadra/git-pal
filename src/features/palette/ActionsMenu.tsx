import { useRef } from "react";

import { Keybind } from "~/components/keybind";
import { ShortcutKeys } from "~/components/shortcut-keys";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { matchesShortcut, shortcutSymbols } from "~/libs/keymap";

import type { ItemAction } from "./actions";
import { usePaletteKeybind } from "./shortcuts";
import { state, useStateSnaphot } from "./state";

function searchInput() {
  return document.querySelector<HTMLElement>("[data-search]");
}

export function ActionsMenu({ actions }: { actions: ItemAction[] }) {
  const snapshot = useStateSnaphot();
  const keybind = usePaletteKeybind();
  const inputRef = useRef<HTMLInputElement>(null);

  const run = (action: ItemAction) => {
    state.toggleActions(false);
    action.run();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (matchesShortcut(e, keybind.actions)) {
      e.preventDefault();
      state.toggleActions(false);
      return;
    }

    const action = actions.find(
      (a) => a.id !== "primaryAction" && matchesShortcut(e, keybind[a.id]),
    );

    console.log({ action })

    if (!action) return;

    e.preventDefault();
    run(action);
  };

  return (
    <Popover open={snapshot.displayActions} onOpenChange={state.toggleActions}>
      <PopoverTrigger className="cursor-pointer rounded-md px-1 py-0.5 hover:bg-accent">
        <Keybind label="Actions" keys={shortcutSymbols(keybind.actions)} />
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        className="w-72 p-0"
        initialFocus={inputRef}
        finalFocus={searchInput}
      >
        <Command className="h-auto bg-transparent">
          <CommandInput
            ref={inputRef}
            placeholder="Search actions"
            onKeyDown={handleKeyDown}
          />
          <CommandList className="mt-2 px-1 pb-1">
            <CommandEmpty>No actions</CommandEmpty>
            <CommandGroup className="p-0">
              {actions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={action.label}
                  onSelect={() => run(action)}
                  className="min-h-8 text-sm"
                >
                  <span className="flex-1">{action.label}</span>
                  <ShortcutKeys shortcut={keybind[action.id]} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
