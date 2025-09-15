import { useEffect } from "react";

export function useColorScheme() {
  useEffect(() => {
    const darkMode = window.matchMedia("(prefers-color-scheme: dark)");

    function toggleDarkMode(e: MediaQueryListEvent | MediaQueryList) {
      document.documentElement.classList.toggle(
        "dark",
        localStorage.theme === "dark" ||
          (!("theme" in localStorage) && e.matches),
      );
    }

    darkMode.addEventListener("change", toggleDarkMode);

    toggleDarkMode(darkMode);

    return () => {
      darkMode.removeEventListener("change", toggleDarkMode);
    };
  }, []);
}
