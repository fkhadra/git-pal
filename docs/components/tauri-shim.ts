import type { Settings } from "~/models/settings";

// app modules read the settings the Tauri window hydrates
globalThis.settings = {
  theme: "dark",
  harness: "claude",
  avatar: { type: "mech", color: "#c084fc" },
  keybind: { showPalette: "cmd+G" },
} as Settings;

// IPC that never answers, event listeners register and stay silent
Object.assign(window, {
  __TAURI_INTERNALS__: {
    invoke: () => new Promise(() => {}),
    transformCallback: () => 0,
    metadata: {
      currentWindow: { label: "docs" },
      currentWebview: { windowLabel: "docs", label: "docs" },
    },
  },
});
