import { useSyncExternalStore } from "react";

const THEME_ATTRIBUTES = ["data-theme", "class"];

const probe = document
  .createElement("canvas")
  .getContext("2d", { willReadFrequently: true });

/** Any CSS colour as hex, canvas drawings don't read CSS variables or oklch. */
function toHex(color: string) {
  if (!probe) return color;

  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = color;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;

  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

// themes switch through attributes on <html>
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: THEME_ATTRIBUTES,
  });

  return () => observer.disconnect();
}

/** Resolved value of a colour variable, e.g. `--primary-foreground`, following the theme. */
export function useCssColor(variable: string) {
  return useSyncExternalStore(subscribe, () => {
    const value = getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();

    return toHex(value);
  });
}
