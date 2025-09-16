import { useNavigate, useRouter } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCommandState } from "cmdk";
import { useState } from "react";
import { useSelectedItem } from "~/store";

export function useKeybinds() {
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const selectedItem = useSelectedItem();
  const router = useRouter();
  const inputValue = useCommandState((s) => s.search);

  const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (router.history.canGoBack() && e.key === "Backspace" && !inputValue) {
      router.history.back();
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
    } else if (e.key === "Escape") {
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
