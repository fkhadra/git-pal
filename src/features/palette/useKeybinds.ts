import { useNavigate, useRouter } from "@tanstack/react-router";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useState } from "react";
import { useSelectedItem } from "~/store";

const Keys = {
  Backspace: "Backspace",
  Esc: "Escape",
  Tab: "Tab",
};

export function useKeybinds() {
  const [filter, setFilter] = useState("");
  const navigate = useNavigate();
  const selectedItem = useSelectedItem();
  const router = useRouter();

  const handleKeyboard = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    const shouldGoToPreviousPage =
      (e.key === Keys.Backspace || e.key === Keys.Esc) &&
      router.history.canGoBack() &&
      !filter;
    const shouldEnableCodeSearch =
      e.metaKey &&
      e.key === "/" &&
      selectedItem &&
      selectedItem.item &&
      selectedItem.supportGithubSearch;
    const shouldHideWindowOrClearFilter = e.key === Keys.Esc;
    const shouldDisplayRepositoryPages =
      e.key === "Tab" && selectedItem.item?.kind === "repo";
    const shouldDisplayPullRequestPage =
      e.key === Keys.Tab && selectedItem.item?.kind === "pr";

    if (shouldGoToPreviousPage) {
      router.history.back();
    } else if (shouldEnableCodeSearch) {
      const owner = selectedItem.owner;
      const repo =
        selectedItem?.item?.kind === "repo"
          ? selectedItem.item.data.name
          : void 0;

      if (owner) {
        setFilter("");
        navigate({
          to: "/palette/search",
          search: {
            owner: selectedItem.owner,
            repo,
          },
        });
      }
    } else if (shouldHideWindowOrClearFilter) {
      if (filter.length === 0) {
        getCurrentWindow().hide();
      } else {
        setFilter("");
      }
    } else if (shouldDisplayRepositoryPages) {
      setFilter("");
      e.preventDefault();
      navigate({
        to: "/palette/repository/$id",
        params: {
          id: selectedItem.value,
        },
      });
    } else if (shouldDisplayPullRequestPage) {
      e.preventDefault();
      navigate({
        to: "/palette/pull-request/$id",
        params: {
          id: selectedItem.value,
        },
      });
    }
  };

  return {
    filter,
    setFilter,
    handleKeyboard,
  };
}
