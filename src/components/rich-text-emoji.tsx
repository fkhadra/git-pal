import {
  Emoji,
  type EmojiItem,
  EmojiSuggestionPluginKey,
  gitHubEmojis,
  shortcodeToEmoji,
} from "@tiptap/extension-emoji";
import type { EditorState } from "@tiptap/pm/state";
import { cn } from "cn";

import {
  type SuggestionListProps,
  suggestionPopup,
} from "./rich-text-suggestion";

const MAX_SUGGESTIONS = 8;

// GitHub's custom emojis (e.g. :octocat:) have no character to insert
const EMOJIS = gitHubEmojis.filter((item) => item.emoji);

function matches(item: EmojiItem, query: string) {
  return (
    item.shortcodes.some((s) => s.startsWith(query)) ||
    item.tags.some((t) => t.startsWith(query))
  );
}

function EmojiList({
  items,
  selected,
  onSelect,
}: SuggestionListProps<EmojiItem>) {
  if (items.length === 0) return null;

  return (
    <div className="flex w-56 flex-col rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      {items.map((item, index) => (
        <button
          key={item.name}
          type="button"
          // keeps the editor focused
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(item)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1 text-left",
            index === selected && "bg-muted",
          )}
        >
          <span>{item.emoji}</span>
          <span className="truncate text-muted-foreground">
            :{item.shortcodes[0]}:
          </span>
        </button>
      ))}
    </div>
  );
}

/** True while the `:` suggestions are open, they own Enter and Escape. */
export function isSuggestingEmoji(state: EditorState) {
  return !!EmojiSuggestionPluginKey.getState(state)?.active;
}

/** `:shortcode:` suggestions, written as emoji characters so the preview renders them too. */
export const EmojiExtension = Emoji.extend({
  renderMarkdown: (node) => {
    const name = node.attrs?.name;
    if (!name) return "";

    return shortcodeToEmoji(name, EMOJIS)?.emoji ?? `:${name}:`;
  },
}).configure({
  emojis: EMOJIS,
  suggestion: {
    items: ({ query }) =>
      EMOJIS.filter((item) => matches(item, query.toLowerCase())).slice(
        0,
        MAX_SUGGESTIONS,
      ),
    render: suggestionPopup(EmojiList, (item) => ({ name: item.name })),
  },
});
