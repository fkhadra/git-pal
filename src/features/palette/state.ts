import { useCommandState } from "cmdk";
import { proxy, useSnapshot } from "valtio";

import type {
  FindPullRequestsFilter,
  Organization,
  PullRequest,
  Repository,
} from "~/models";

export interface AuthorChip {
  login: string;
  avatarUrl: string;
}

type PaletteItemValue =
  | { kind: "pr"; data: PullRequest }
  | { kind: "repo"; data: Repository }
  | { kind: "org"; data: Organization };

type PaletteItem = Omit<ReturnType<typeof createPaletteItem>, "data" | "kind"> &
  PaletteItemValue;

export function createPaletteItem(item: PaletteItemValue) {
  return {
    kind: item.kind,
    data: item.data,
    supportGithubSearch() {
      return item.kind === "org" || item.kind === "repo";
    },
    owner() {
      if (item.kind === "org") {
        return item.data.login;
      } else if (item.kind === "repo") {
        return item.data.owner.login;
      }

      return null;
    },
  };
}

const paletteItems = new Map<string, ReturnType<typeof createPaletteItem>>();

type Page =
  | { to: "home" }
  | {
      to: "org";
      params: {
        name: string;
      };
    }
  | {
      to: "pull-requests";
      params: {
        filter: FindPullRequestsFilter;
      };
    }
  | {
      to: "repository";
      params: {
        id: string;
      };
    }
  | {
      to: "repository-pull-requests";
      params: {
        owner: string;
        repository: string;
      };
    }
  | {
      to: "search";
      params: {
        owner: string;
        repo?: string;
      };
    }
  | {
      to: "review-template";
      params: {
        owner: string;
        repository: string;
        prNumber: number;
      };
    };

export function createPageMapper(map: Record<PageTo, React.FC>) {
  return map;
}

export type PageTo = Page["to"];

// pages searching on GitHub, cmdk must not filter their results
const SERVER_SEARCH_PAGES: PageTo[] = ["search", "repository-pull-requests"];
type CurrentPage<T> = Extract<Page, { to: T }>;

export function useCurrentPage<T extends PageTo>(
  _?: T,
): T extends undefined ? Page : CurrentPage<T> {
  const snap = useSnapshot(state);
  return snap.currentPage as T extends undefined ? Page : CurrentPage<T>;
}

export function useGHSearchActive() {
  const snap = useSnapshot(state);
  return snap.currentPage.to === "search";
}

export function useServerSearch() {
  const snap = useSnapshot(state);
  return SERVER_SEARCH_PAGES.includes(snap.currentPage.to);
}

export function useDisableEmptySearchResults() {
  const snap = useSnapshot(state);
  return snap.disableEmptySearchResults;
}

export function useStateSnaphot() {
  return useSnapshot(state);
}

export function useSyncStateSnapshot() {
  return useSnapshot(state, {
    sync: true,
  });
}

export const state = proxy({
  selectedValue: "",
  filter: "",
  pages: [{ to: "home" }],
  get currentPage() {
    return this.pages[this.pages.length - 1] as Page;
  },
  disableEmptySearchResults: false,
  path: "",
  query: "",
  authorSearch: null as string | null,
  authors: [] as AuthorChip[],
  displayHelp: false,
  displayActions: false,
  clearPath() {
    state.path = "";
  },
  setFilter(value: string) {
    state.filter = value;
  },
  clearFilter() {
    state.filter = "";
    state.query = "";
    state.authorSearch = null;
  },
  setSelectedValue(value: string) {
    state.selectedValue = value;
  },
  canGoBack() {
    return state.pages.length > 1;
  },
  resetPalette() {
    state.pages = [{ to: "home" }];
    state.path = "";
    state.query = "";
    state.authorSearch = null;
    state.authors = [];
    state.filter = "";
    state.disableEmptySearchResults = false;
    state.selectedValue = "";
  },
  goTo(page: Page, path?: string) {
    state.pages.push(page);
    state.filter = "";
    state.query = "";
    state.authorSearch = null;
    state.authors = [];
    state.disableEmptySearchResults = false;
    if (path) {
      state.path = path;
    }
  },
  goBack() {
    if (state.pages.length > 1) {
      state.pages.pop();
      state.query = "";
      state.authorSearch = null;
      state.authors = [];
      state.disableEmptySearchResults = false;

      if (state.pages.length === 1) {
        state.path = "";
      }
    }
  },
  addAuthor(chip: AuthorChip) {
    if (state.authors.some((a) => a.login === chip.login)) return;

    state.authors.push(chip);
  },
  removeAuthor(login: string) {
    state.authors = state.authors.filter((a) => a.login !== login);
  },
  setItem(key: string, value: PaletteItemValue) {
    paletteItems.set(key, createPaletteItem(value));
  },
  getItem(key: string) {
    return paletteItems.get(key) as PaletteItem;
  },
  toggleHelp(v: boolean) {
    state.displayHelp = v;
  },
  toggleActions(v: boolean) {
    state.displayActions = v;
  },
});

export function usePaletteItem() {
  const snapshot = useStateSnaphot();
  const commandValue = useCommandState((s) => s.value);
  const selectedItem = state.getItem(commandValue);
  const parentItem =
    snapshot.currentPage.to === "repository"
      ? state.getItem(snapshot.currentPage.params.id)
      : null;

  return {
    parentItem,
    selectedItem,
    selectedItemValue: commandValue,
    get isPage() {
      return !!commandValue?.startsWith("page");
    },
  };
}
