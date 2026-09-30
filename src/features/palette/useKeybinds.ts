import { getCurrentWindow } from "@tauri-apps/api/window";

import { matchesShortcut } from "~/libs/keymap";

import { useItemActions } from "./actions";
import { paletteKeybind } from "./shortcuts";
import { state, useSyncStateSnapshot } from "./state";

// cmdk only selects on Enter, other primary keys click the highlighted item
const CMDK_SELECT_KEY = "Enter";

export function useKeybinds() {
  const filter = useSyncStateSnapshot().filter;
  const actions = useItemActions();

  const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const keybind = paletteKeybind;
    const is = (shortcut: string) => matchesShortcut(e, shortcut);
    const canGoBack = state.canGoBack();

    if (is(keybind.actions)) {
      e.preventDefault();
      state.toggleActions(true);
      return;
    }

    if (is(keybind.help)) {
      e.preventDefault();
      state.toggleHelp(true);
      return;
    }

    // back to previous page
    if ((is(keybind.goBack) || is(keybind.cancel)) && canGoBack && !filter) {
      e.preventDefault();
      state.goBack();
      return;
    }

    // clear filter or hide window
    if (is(keybind.cancel)) {
      e.preventDefault();
      if (filter.length > 0) {
        state.clearFilter();
      } else {
        getCurrentWindow().hide();
      }

      return;
    }

    // preventDefault keeps cmdk from also selecting the item, it already does on Enter
    const action = actions.find((a) => is(keybind[a.id]));
    const isCmdkSelect =
      action?.id === "primaryAction" &&
      keybind.primaryAction === CMDK_SELECT_KEY;
    if (action && !isCmdkSelect) {
      e.preventDefault();
      action.run();
      return;
    }

    // Enter no longer selects once remapped
    if (keybind.primaryAction !== CMDK_SELECT_KEY && is(CMDK_SELECT_KEY)) {
      e.preventDefault();
      return;
    }

    // Tab never leaves the search input
    if (is(keybind.secondaryAction)) {
      e.preventDefault();
    }
  };

  return {
    filter,
    setFilter: state.setFilter,
    handleKeyboard,
  };
}
