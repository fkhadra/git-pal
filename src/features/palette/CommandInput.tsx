import { Command } from "cmdk";
import { Search } from "lucide-react";
import { useRef } from "react";

import { UpdateAppButton } from "~/components/update-app-button";

import { state, useGHSearchActive, useStateSnaphot } from "./state";
import { useKeybinds } from "./useKeybinds";

export function CommandInput() {
  const isGhSearchActive = useGHSearchActive();
  const { filter, setFilter, handleKeyboard } = useKeybinds();
  const snapshot = useStateSnaphot();
  const h = useRef<ReturnType<typeof setTimeout>>(undefined);

  return (
    <div className="group mb-2 flex w-full items-center gap-1 rounded-none border-b bg-transparent px-3 py-2">
      <Search className="text-muted-foreground transition-colors group-focus-within:text-primary" />
      {snapshot.path && (
        <div className="flex items-center justify-center rounded-md border border-kbd-border bg-kbd px-2 text-sm text-kbd-foreground">
          <span>~</span>
          <span>/</span>
          <span>{snapshot.path}</span>
        </div>
      )}
      <Command.Input
        autoFocus
        data-search
        placeholder={isGhSearchActive ? "Search code" : "Search"}
        value={filter}
        onKeyDown={handleKeyboard}
        onValueChange={(search) => {
          setFilter(search);

          if (snapshot.currentPage.to === "org") {
            clearTimeout(h.current);

            h.current = setTimeout(() => {
              state.query = search;
            }, 250);
          }
        }}
        className="flex-1 p-2 caret-primary outline-none placeholder:text-muted-foreground"
      />
      <UpdateAppButton />
    </div>
  );
}
