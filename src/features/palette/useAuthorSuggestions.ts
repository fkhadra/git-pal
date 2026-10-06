import { keepPreviousData, skipToken, useQuery } from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";
import { useState } from "react";

import commands from "~/commands";
import type { MentionableUser } from "~/models/graphql";

import { type AuthorChip, state, useStateSnaphot } from "./state";

const USERS_STALE_MS = minutesToMilliseconds(5);
// `author:` qualifier, or its `from:` alias, being typed at the end of the search
const TRAILING_AUTHOR = /(^|\s)(author|from):([\w-]*)$/;
// GitHub only knows `author:`
const FROM_ALIAS = /(^|\s)from:/g;

/** Login typed after a trailing `author:` or `from:`, null without one. */
export function authorPartial(search: string) {
  return TRAILING_AUTHOR.exec(search)?.[3] ?? null;
}

/** Search sent to GitHub, chips and aliases as `author:` qualifiers. */
export function githubQuery(authors: readonly AuthorChip[], text: string) {
  const qualifiers = authors.map((a) => `author:${a.login}`);

  return [...qualifiers, text.replace(FROM_ALIAS, "$1author:")].join(" ");
}

/** Suggests repository users while an `author:` qualifier is typed, picked with Enter or Tab. */
export function useAuthorSuggestions(onPick: () => void) {
  const snapshot = useStateSnaphot();
  const page = snapshot.currentPage;
  const params = page.to === "repository-pull-requests" ? page.params : null;
  const partial = snapshot.authorSearch;
  const request =
    params && partial !== null ? { ...params, query: partial } : null;
  const [selected, setSelected] = useState(0);
  const [selectedFor, setSelectedFor] = useState(partial);

  const { data: users = [] } = useQuery({
    queryKey: [
      "mentionable-users",
      request?.owner,
      request?.repository,
      request?.query,
    ],
    queryFn: request ? () => commands.getMentionableUsers(request) : skipToken,
    staleTime: USERS_STALE_MS,
    placeholderData: keepPreviousData,
  });

  // a new partial login starts from the first user
  if (partial !== selectedFor) {
    setSelectedFor(partial);
    setSelected(0);
  }

  const isOpen = !!request && users.length > 0;

  function pick(user: MentionableUser) {
    const match = TRAILING_AUTHOR.exec(state.filter);
    if (!match) return;

    const [, space, qualifier] = match;
    const search = state.filter.slice(0, match.index + space.length);

    state.setFilter(search);
    state.addAuthor({
      qualifier,
      login: user.login,
      avatarUrl: user.avatarUrl,
    });
    state.authorSearch = null;
    state.query = search;
    onPick();
  }

  /** True when the key was handled, the palette must ignore it. */
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen) return false;

    if (e.key === "Escape") {
      e.preventDefault();
      state.authorSearch = null;
      return true;
    }

    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      pick(users[selected]);
      return true;
    }

    const offset = { ArrowDown: 1, ArrowUp: -1 }[e.key];
    if (!offset) return false;

    e.preventDefault();
    setSelected((selected + offset + users.length) % users.length);
    return true;
  }

  return { isOpen, users, selected, pick, handleKey };
}
