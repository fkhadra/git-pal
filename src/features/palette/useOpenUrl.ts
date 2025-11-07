import { openUrl } from "@tauri-apps/plugin-opener";
import { state } from "./state";

export function useOpenUrl() {
	return (url: string) => {
		openUrl(url);
		state.resetPalette();
	};
}
