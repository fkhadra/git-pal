import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useCommandState } from "cmdk";
import { useSelectedItem } from "~/store";
import { useGhSearchActive } from "./useGhSearchActive";

export function useKeybinds() {
  const navigate = useNavigate();
  const selectedItem = useSelectedItem();
  const router = useRouter();
  const isGhSearchActive = useGhSearchActive();
  const inputValue = useCommandState((s) => s.search);

  const handler = async (e: React.KeyboardEvent<HTMLInputElement>) => {
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
    }
  };

  return handler;
}
