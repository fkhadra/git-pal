/// <reference types="vite/client" />

export declare global {
	interface Window {
		currentView: "setup" | "settings" | "palette";
	}
}
