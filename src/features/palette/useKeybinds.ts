import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";
import { state, usePaletteItem } from "./state";

const Key = {
	Backspace: "Backspace",
	Esc: "Escape",
	Tab: "Tab",
	Slash: "/",
};

export function useKeybinds() {
	const [filter, setFilter] = useState("");
	const { selectedItem, parentItem } = usePaletteItem();

	const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		const { key, metaKey } = e;
		const canGoBack = state.canGoBack();

		// back to previous page
		if ((key === Key.Backspace || key === Key.Esc) && canGoBack && !filter) {
			state.goBack();
			return;
		}

		// clear filter or hide window
		if (key === Key.Esc) {
			if (filter.length > 0) {
				setFilter("");
			} else {
				getCurrentWindow().hide();
			}

			return;
		}

		if (key === Key.Tab) {
			e.preventDefault();
		}

		// go to repo page
		if (key === Key.Tab && selectedItem.kind === "repo") {
			setFilter("");
			state.goTo(
				{
					to: "repository",
					params: {
						id: selectedItem.data.id,
					},
				},
				`${selectedItem.owner()}/${selectedItem.data.name}`,
			);
		}

		// go to org page
		if (key === Key.Tab && selectedItem.kind === "org") {
			e.preventDefault();
			setFilter("");
			state.goTo(
				{
					to: "org",
					params: {
						name: selectedItem.data.login,
					},
				},
				selectedItem.data.login,
			);
		}

		// code search, selected item first then root if any
		if (
			metaKey &&
			key === Key.Slash &&
			(selectedItem?.supportGithubSearch() || parentItem?.supportGithubSearch())
		) {
			setFilter("");
			const item = selectedItem || parentItem;
			const owner = item.owner();
			const repo = item?.kind === "repo" ? item.data.name : void 0;

			if (owner) {
				state.goTo({
					to: "search",
					params: {
						owner,
						repo,
					},
				});
			}
		}
	};

	return {
		filter,
		setFilter,
		handleKeyboard,
	};
}
