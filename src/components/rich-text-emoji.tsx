import {
  Emoji,
  type EmojiItem,
  EmojiSuggestionPluginKey,
  gitHubEmojis,
  shortcodeToEmoji,
} from "@tiptap/extension-emoji";
import type { EditorState } from "@tiptap/pm/state";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionOptions, SuggestionProps } from "@tiptap/suggestion";
import { cn } from "cn";

const MAX_SUGGESTIONS = 8;
const POPUP_GAP_PX = 4;
// opens above the caret when this much room is missing below
const POPUP_MAX_HEIGHT_PX = 300;

// GitHub's custom emojis (e.g. :octocat:) have no character to insert
const EMOJIS = gitHubEmojis.filter((item) => item.emoji);

function matches(item: EmojiItem, query: string) {
  return (
    item.shortcodes.some((s) => s.startsWith(query)) ||
    item.tags.some((t) => t.startsWith(query))
  );
}

interface ListProps {
  items: EmojiItem[];
  selected: number;
  onSelect: (item: EmojiItem) => void;
}

function EmojiList({ items, selected, onSelect }: ListProps) {
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

const renderSuggestions: SuggestionOptions<EmojiItem>["render"] = () => {
  let renderer: ReactRenderer<unknown, ListProps> | null = null;
  let props: SuggestionProps<EmojiItem> | null = null;
  let selected = 0;

  function select(item: EmojiItem) {
    props?.command({ name: item.name });
  }

  function update() {
    if (!props) return;

    renderer?.updateProps({ items: props.items, selected, onSelect: select });
  }

  function place() {
    const rect = props?.clientRect?.();
    const element = renderer?.element as HTMLElement | undefined;
    if (!rect || !element) return;

    const fitsBelow = rect.bottom + POPUP_MAX_HEIGHT_PX < window.innerHeight;
    element.style.left = `${rect.left}px`;
    element.style.top = fitsBelow ? `${rect.bottom + POPUP_GAP_PX}px` : "";
    element.style.bottom = fitsBelow
      ? ""
      : `${window.innerHeight - rect.top + POPUP_GAP_PX}px`;
  }

  return {
    onStart: (next) => {
      props = next;
      selected = 0;
      renderer = new ReactRenderer(EmojiList, {
        props: { items: next.items, selected, onSelect: select },
        editor: next.editor,
      });

      const element = renderer.element as HTMLElement;
      element.style.position = "fixed";
      element.style.zIndex = "50";
      document.body.appendChild(element);
      place();
    },

    onUpdate: (next) => {
      props = next;
      selected = 0;
      update();
      place();
    },

    onKeyDown: ({ event }) => {
      const count = props?.items.length ?? 0;
      if (!props || count === 0) return false;

      if (event.key === "Enter" || event.key === "Tab") {
        select(props.items[selected]);
        return true;
      }

      const offset = { ArrowDown: 1, ArrowUp: -1 }[event.key];
      if (!offset) return false;

      selected = (selected + offset + count) % count;
      update();
      return true;
    },

    onExit: () => {
      renderer?.element.remove();
      renderer?.destroy();
      renderer = null;
      props = null;
    },
  };
};

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
    render: renderSuggestions,
  },
});
