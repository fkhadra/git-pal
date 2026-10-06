import { Command } from "cmdk";
import { Search, X } from "lucide-react";
import { useRef } from "react";

import { MentionList } from "~/components/rich-text-mention";
import { UpdateAppButton } from "~/components/update-app-button";

import {
  type PageTo,
  state,
  useGHSearchActive,
  useStateSnaphot,
} from "./state";
import { authorPartial, useAuthorSuggestions } from "./useAuthorSuggestions";
import { useKeybinds } from "./useKeybinds";

// pages refetching as the user types
const QUERY_PAGES: PageTo[] = ["org", "repository-pull-requests"];
const REMOVE_CHIP_KEY = "Backspace";

export function CommandInput() {
  const isGhSearchActive = useGHSearchActive();
  const { filter, setFilter, handleKeyboard } = useKeybinds();
  const snapshot = useStateSnaphot();
  const h = useRef<ReturnType<typeof setTimeout>>(undefined);
  // a pending search would bring the picked author's suggestions back
  const suggestions = useAuthorSuggestions(() => clearTimeout(h.current));

  return (
    <div className="group relative mb-2 flex w-full items-center gap-1 rounded-none border-b bg-transparent px-3 py-2">
      <Search className="text-muted-foreground transition-colors group-focus-within:text-primary" />
      {snapshot.path && (
        <div className="flex items-center justify-center rounded-md border border-kbd-border bg-kbd px-2 text-sm text-kbd-foreground">
          <span>~</span>
          <span>/</span>
          <span>{snapshot.path}</span>
        </div>
      )}
      {snapshot.authors.map((author) => (
        <div
          key={author.login}
          className="flex items-center gap-1 rounded-md border border-kbd-border bg-kbd pr-1 pl-1.5 text-sm text-kbd-foreground"
        >
          <img src={author.avatarUrl} alt="" className="size-4 rounded-full" />
          <span className="text-muted-foreground">{author.qualifier}:</span>
          <span>{author.login}</span>
          <button
            type="button"
            aria-label={`Remove ${author.login}`}
            // keeps the search input focused
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => state.removeAuthor(author.login)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
      <Command.Input
        autoFocus
        data-search
        placeholder={isGhSearchActive ? "Search code" : "Search"}
        value={filter}
        onKeyDown={(e) => {
          if (suggestions.handleKey(e)) return;

          // before going back, which shares the key
          const lastAuthor = snapshot.authors[snapshot.authors.length - 1];
          if (e.key === REMOVE_CHIP_KEY && !filter && lastAuthor) {
            e.preventDefault();
            state.removeAuthor(lastAuthor.login);
            return;
          }

          handleKeyboard(e);
        }}
        onValueChange={(search) => {
          setFilter(search);

          if (QUERY_PAGES.includes(snapshot.currentPage.to)) {
            clearTimeout(h.current);

            h.current = setTimeout(() => {
              // a partial login matches no pull request, wait for the full one
              const partial =
                snapshot.currentPage.to === "repository-pull-requests"
                  ? authorPartial(search)
                  : null;
              state.authorSearch = partial;
              if (partial === null) state.query = search;
            }, 250);
          }
        }}
        className="flex-1 p-2 caret-primary outline-none placeholder:text-muted-foreground"
      />
      <UpdateAppButton />
      {suggestions.isOpen && (
        <div className="absolute top-full left-12 z-50">
          <MentionList
            items={suggestions.users}
            selected={suggestions.selected}
            onSelect={suggestions.pick}
          />
        </div>
      )}
    </div>
  );
}
