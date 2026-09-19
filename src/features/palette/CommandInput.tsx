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
    <div className="group mb-2 flex w-full items-center gap-1 rounded-none border-b border-zinc-800/10 bg-transparent px-3 py-2 dark:border-pink-300/10">
      <Search className="text-muted-foreground transition-colors group-focus-within:text-purple-400" />
      {snapshot.path && (
        <div className="flex items-center justify-center rounded-md border border-pink-300/40 bg-zinc-900 px-2 text-sm text-pink-200">
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
        className="flex-1 p-2 caret-purple-400 outline-none placeholder:text-gray-600 dark:placeholder:text-gray-500"
      />
      <UpdateAppButton />
    </div>
  );
}
