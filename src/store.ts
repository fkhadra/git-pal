import { useCommandState } from "cmdk";
import { Organization, PullRequest, Repository } from "~/models";

type Value =
  | { kind: "pr"; data: PullRequest }
  | { kind: "repo"; data: Repository }
  | { kind: "org"; data: Organization };

export const Store = new Map<string, Value>();

export function useSelectedItem() {
  const commandValue = useCommandState((s) => s.value);
  const selectedItem = Store.get(commandValue);

  return {
    value: commandValue,
    get isPage() {
      return !!commandValue?.startsWith("page");
    },
    item: selectedItem,
    supportGithubSearch:
      selectedItem?.kind === "org" || selectedItem?.kind === "repo",
    get owner() {
      if (selectedItem?.kind === "org") {
        return selectedItem.data.login;
      } else if (selectedItem?.kind === "repo") {
        return selectedItem.data.owner.login;
      }

      return null;
    },
  };
}
