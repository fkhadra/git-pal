import { useSearch } from "@tanstack/react-router";
import { useCommandState } from "cmdk";
import type { Organization, PullRequest, Repository } from "~/models";

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

export const state = {
	setItem(key: string, value: PaletteItemValue) {
		paletteItems.set(key, createPaletteItem(value));
	},
	getItem(key: string) {
		return paletteItems.get(key) as PaletteItem;
	},
};

export function usePaletteItem() {
	const searchParams = useSearch({ from: "/palette" });
	const commandValue = useCommandState((s) => s.value);
	const selectedItem = state.getItem(commandValue);
	const rootItem = searchParams.r ? state.getItem(searchParams.r) : null;

	return {
		rootItem,
		selectedItem,
		selectedItemValue: commandValue,
		get isPage() {
			return !!commandValue?.startsWith("page");
		},
	};
}
