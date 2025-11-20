import { useCommandState } from "cmdk";
import { proxy, useSnapshot } from "valtio";
import type {
	FindPullRequestsFilter,
	Organization,
	PullRequest,
	Repository,
} from "~/models";

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
			to: "search";
			params: {
				owner: string;
				repo?: string;
			};
	  };

export function createPageMapper(map: Record<PageTo, React.FC>) {
	return map;
}

type PageTo = Page["to"];
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

export function useStateSnaphot() {
	return useSnapshot(state);
}

export const state = proxy({
	pages: [{ to: "home" }],
	get currentPage() {
		return this.pages[this.pages.length - 1] as Page;
	},
	path: "",
	query: "",
	clearPath() {
		state.path = "";
	},
	canGoBack() {
		return state.pages.length > 1;
	},
	resetPalette() {
		state.pages = [{ to: "home" }];
		state.path = "";
		state.query = "";
	},
	goTo(page: Page, path?: string) {
		state.pages.push(page);
		if (path) {
			state.path = path;
		}
	},
	goBack() {
		if (state.pages.length > 1) {
			state.pages.pop();

			if (state.pages.length === 1) {
				state.path = "";
			}
		}
	},
	setItem(key: string, value: PaletteItemValue) {
		paletteItems.set(key, createPaletteItem(value));
	},
	getItem(key: string) {
		return paletteItems.get(key) as PaletteItem;
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
