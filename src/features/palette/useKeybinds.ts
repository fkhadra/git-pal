import {
	type RouterState,
	useNavigate,
	useRouter,
	useRouterState,
} from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { usePaletteItem } from "./state";
import { usePendingRoute } from "./usePendingRoute";

const Key = {
	Backspace: "Backspace",
	Esc: "Escape",
	Tab: "Tab",
	Slash: "/",
};

export function useKeybinds() {
	const [filter, setFilter] = useState("");
	const navigate = useNavigate();
	const { selectedItem, rootItem } = usePaletteItem();
	const router = useRouter();
	const isLoadingRoute = usePendingRoute();

	useEffect(() => {
		if (isLoadingRoute) {
			setFilter("");
		}
	}, [isLoadingRoute]);

	const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
		const { key, metaKey } = e;
		const canGoBack = router.history.canGoBack();

		// back to previous page
		if ((key === Key.Backspace || key === Key.Esc) && canGoBack && !filter) {
			router.history.back();
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

		// go to repo page
		if (key === Key.Tab && selectedItem.kind === "repo") {
			e.preventDefault();
			navigate({
				to: "/palette/repository/$id",
				params: {
					id: selectedItem.data.id,
				},
				search: {
					r: selectedItem.data.id,
					p: `${selectedItem.owner()}/${selectedItem.data.name}`,
				},
			});
		}

		// go to org page
		if (key === Key.Tab && selectedItem.kind === "org") {
			e.preventDefault();
			navigate({
				to: "/palette/org/$name",
				params: {
					name: selectedItem.data.login,
				},
			});
		}

		// code search, selected item first then root if any
		if (
			metaKey &&
			key === Key.Slash &&
			(selectedItem?.supportGithubSearch() || rootItem?.supportGithubSearch())
		) {
			const item = selectedItem || rootItem;
			const owner = item.owner();
			const repo = item?.kind === "repo" ? item.data.name : void 0;

			if (owner) {
				navigate({
					to: "/palette/search",
					search: {
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
