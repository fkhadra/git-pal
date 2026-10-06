import Mention from "@tiptap/extension-mention";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { type EditorState, PluginKey } from "@tiptap/pm/state";
import { cn } from "cn";

import type { MentionableUser } from "~/models/graphql";

import {
  type SuggestionListProps,
  suggestionPopup,
} from "./rich-text-suggestion";

const SEARCH_DEBOUNCE_MS = 200;
// GitHub logins, not part of an email, a team (`@org/team`) or a longer word
const MENTION =
  /(?<![\w`])@([a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38})(?![\w/-])/gi;

const MentionSuggestionPluginKey = new PluginKey("mentionSuggestion");

export type SearchUsers = (query: string) => Promise<MentionableUser[]>;

export function MentionList({
  items,
  selected,
  onSelect,
}: SuggestionListProps<MentionableUser>) {
  if (items.length === 0) return null;

  return (
    <div className="flex w-92 flex-col rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
      {items.map((user, index) => (
        <button
          key={user.login}
          type="button"
          // keeps the editor focused
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(user)}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1 text-left",
            index === selected && "bg-muted",
          )}
        >
          <img src={user.avatarUrl} alt="" className="size-5 rounded-full" />
          <span className="font-medium">{user.login}</span>
          {user.name && (
            <span className="truncate text-muted-foreground">{user.name}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** True while the `@` suggestions are open, they own Enter and Escape. */
export function isSuggestingMention(state: EditorState) {
  return !!MentionSuggestionPluginKey.getState(state)?.active;
}

interface Found {
  from: number;
  to: number;
  login: string;
}

/** Plain `@login` texts, those in code, links or other marks keep their formatting as text. */
function findMentions(doc: ProseMirrorNode) {
  const found: Found[] = [];

  doc.descendants((node, pos) => {
    if (node.type.spec.code) return false;
    if (!node.isText || node.marks.length > 0) return;

    for (const match of node.text?.matchAll(MENTION) ?? []) {
      const from = pos + match.index;
      found.push({ from, to: from + match[0].length, login: match[1] });
    }
  });

  return found;
}

/** `@login` suggestions shown as chips, written as plain mentions GitHub links. */
export function mentionExtension(search: SearchUsers) {
  return Mention.extend({
    // drops the `[@ id="…"]` syntax, it turns links like `[@login](url)` into mentions
    markdownTokenizer: {
      name: "mention",
      level: "inline",
      start: () => -1,
      tokenize: () => undefined,
    },
    renderMarkdown: (node) => `@${node.attrs?.id}`,

    // markdown only marks text, mentions are turned into chips once loaded
    onCreate() {
      const { tr } = this.editor.state;

      for (const { from, to, login } of findMentions(tr.doc).reverse()) {
        tr.replaceWith(from, to, this.type.create({ id: login, label: login }));
      }

      if (!tr.docChanged) return;

      tr.setMeta("addToHistory", false).setMeta("preventUpdate", true);
      this.editor.view.dispatch(tr);
    },
  }).configure({
    HTMLAttributes: {
      class: "rounded bg-primary/10 px-1 py-0.5 font-medium text-primary",
    },
    suggestion: {
      pluginKey: MentionSuggestionPluginKey,
      debounce: SEARCH_DEBOUNCE_MS,
      items: ({ query }) => search(query),
      render: suggestionPopup(MentionList, (user) => ({
        id: user.login,
        label: user.login,
      })),
    },
  });
}
