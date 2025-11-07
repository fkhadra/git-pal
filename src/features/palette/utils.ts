import { openUrl as open } from "@tauri-apps/plugin-opener";
import { state } from "./state";

export function openUrl(url: string) {
	open(url).finally(() => {
		state.resetPalette();
	});
}
