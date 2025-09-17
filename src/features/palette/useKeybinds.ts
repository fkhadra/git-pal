import { useNavigate, useRouter } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";
import { useSelectedItem } from "~/store";

const Keys = {
  Backspace: "Backspace",
  Esc: "Escape",
};

export function useKeybinds() {
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const selectedItem = useSelectedItem();
  const router = useRouter();

  const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      (e.key === Keys.Backspace || e.key === Keys.Esc) &&
      router.history.canGoBack() &&
      !filter
    ) {
      router.history.back();
      return;
    }

    if (
      e.metaKey &&
      e.key === "/" &&
      selectedItem &&
      selectedItem.item &&
      selectedItem.supportGithubSearch
    ) {
      const owner = selectedItem.owner;
      const repo =
        selectedItem.item.kind === "repo"
          ? selectedItem.item.data.name
          : void 0;

      if (owner) {
        navigate({
          to: "/palette/search",
          search: {
            owner: selectedItem.owner,
            repo,
          },
        });
      }
    } else if (e.key === Keys.Esc) {
      if (filter.length === 0) {
        getCurrentWindow().hide();
      } else {
        setFilter("");
      }
    }
  };

  return {
    filter,
    setFilter,
    handleKeyboard,
  };
}
