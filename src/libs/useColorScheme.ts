import { useEffect, useRef } from "react";
import commands from "~/commands";
import { themeSwitcher } from "./utils";

export function useColorScheme(initialTheme?: string) {
	const userDefinedTheme = useRef(initialTheme);

	useEffect(() => {
		const listener = commands.onThemeChanged((event) => {
			themeSwitcher(event.payload.themeChanged);
			userDefinedTheme.current = event.payload.themeChanged;
		});

		return () => {
			listener.then((unsub) => unsub());
		};
	}, []);

	useEffect(() => {
		const darkMode = window.matchMedia("(prefers-color-scheme: dark)");

		function toggleDarkMode(e: MediaQueryListEvent | MediaQueryList) {
			if (userDefinedTheme.current) {
				themeSwitcher(userDefinedTheme.current);
				return;
			}

			document.documentElement.classList.toggle("dark", e.matches);
		}

		darkMode.addEventListener("change", toggleDarkMode);

		toggleDarkMode(darkMode);

		return () => {
			darkMode.removeEventListener("change", toggleDarkMode);
		};
	}, []);
}
