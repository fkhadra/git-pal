import { useEffect } from "react";
import { proxy, useSnapshot } from "valtio";

const HOLD_MS = 600;

// osx ⌘, the rest ctrl
const MODIFIER_KEY = navigator.userAgent.includes("Mac") ? "Meta" : "Control";

const state = proxy({ isVisible: false });

export function useShortcutsHintVisible() {
  return useSnapshot(state).isVisible;
}

export function useShortcutHint() {
  useEffect(() => {
    let timer: number | undefined;

    const hide = () => {
      clearTimeout(timer);
      state.isVisible = false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // any other key means a shortcut is being typed
      if (e.key !== MODIFIER_KEY) return hide();
      if (e.repeat) return;

      timer = window.setTimeout(() => {
        state.isVisible = true;
      }, HOLD_MS);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === MODIFIER_KEY) hide();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    window.addEventListener("blur", hide);

    return () => {
      hide();
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", hide);
    };
  }, []);
}
