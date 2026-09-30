import { useEffect, useRef } from "react";

import commands from "~/commands";
import type { settings } from "~/models";

const DARK_SCHEME = "(prefers-color-scheme: dark)";
const LIGHT_THEMES: settings.Theme[] = ["light", "catppuccinLatte"];

export function applyTheme(theme: settings.Theme) {
  const isSystemDark = window.matchMedia(DARK_SCHEME).matches;
  const systemTheme = isSystemDark ? "dark" : "light";
  const resolved = theme === "system" ? systemTheme : theme;
  const isLight = LIGHT_THEMES.includes(resolved);

  document.documentElement.dataset.theme = resolved;
  document.documentElement.classList.toggle("dark", !isLight);
}

export function useColorScheme(initialTheme: settings.Theme) {
  const userDefinedTheme = useRef(initialTheme);

  useEffect(() => {
    const listener = commands.onThemeChanged((event) => {
      userDefinedTheme.current = event.payload.themeChanged;
      applyTheme(userDefinedTheme.current);
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, []);

  useEffect(() => {
    const darkMode = window.matchMedia(DARK_SCHEME);
    const reapply = () => applyTheme(userDefinedTheme.current);

    darkMode.addEventListener("change", reapply);
    return () => darkMode.removeEventListener("change", reapply);
  }, []);
}
