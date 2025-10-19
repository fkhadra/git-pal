import { useCommandState } from "cmdk";
import { proxy, useSnapshot } from "valtio";
import type { Organization, PullRequest, Repository } from "~/models";

type Value =
	| { kind: "pr"; data: PullRequest }
	| { kind: "repo"; data: Repository }
	| { kind: "org"; data: Organization };

type RootValue =
	| null
	| { kind: "repo"; data: Repository }
	| { kind: "org"; data: Organization };

const itemStore = new Map<string, Value>();

export const state = proxy({
	currentRoot: null as RootValue,
	setItem(key: string, value: Value) {
		itemStore.set(key, value);
	},
	getItem(key: string) {
		return itemStore.get(key);
	},
});

export function useSelectedItem() {
	const commandValue = useCommandState((s) => s.value);
	const selectedItem = state.getItem(commandValue);

	return {
		value: commandValue,
		get isPage() {
			return !!commandValue?.startsWith("page");
		},
		item: selectedItem,
		supportGithubSearch:
			selectedItem?.kind === "org" || selectedItem?.kind === "repo",
		get owner() {
			if (selectedItem?.kind === "org") {
				return selectedItem.data.login;
			} else if (selectedItem?.kind === "repo") {
				return selectedItem.data.owner.login;
			}

			return null;
		},
	};
}

export function useStoreSnapshot() {
	return useSnapshot(state);
}
