import type { PullRequest } from "~/models";

import type { PaletteAction } from "./shortcuts";
import { state, usePaletteItem } from "./state";
import { openUrl, reviewPullRequest } from "./utils";

export interface ItemAction {
  id: PaletteAction;
  label: string;
  run: () => void;
}

export function selectHighlighted() {
  document
    .querySelector<HTMLElement>(
      '[data-palette-list] [cmdk-item][data-selected="true"]',
    )
    ?.click();
}

function reviewTarget(pr: PullRequest) {
  return {
    owner: pr.repository.owner.login,
    repository: pr.repository.name,
    prNumber: pr.number,
  };
}

function pullRequestActions(pr: PullRequest): ItemAction[] {
  const target = reviewTarget(pr);

  return [
    {
      id: "review",
      label: "Review",
      run: () => reviewPullRequest(target, { type: "auto" }),
    },
    {
      id: "reviewWithTemplate",
      label: "Review with template",
      run: () =>
        state.goTo(
          { to: "review-template", params: target },
          `${target.owner}/${target.repository}#${target.prNumber}`,
        ),
    },
    {
      id: "secondaryAction",
      label: "Open on GitHub",
      run: () => openUrl(pr.url),
    },
  ];
}

export function useItemActions() {
  const { selectedItem, parentItem, isPage } = usePaletteItem();

  const isReviewable = selectedItem?.kind === "pr";
  const actions: ItemAction[] = [
    {
      id: "primaryAction",
      label: isPage || isReviewable ? "View" : "Open",
      run: selectHighlighted,
    },
  ];

  if (selectedItem?.kind === "pr") {
    actions.push(...pullRequestActions(selectedItem.data));
  }

  if (selectedItem?.kind === "repo") {
    const repo = selectedItem.data;
    actions.push({
      id: "secondaryAction",
      label: "Browse repository",
      run: () =>
        state.goTo(
          { to: "repository", params: { id: repo.id } },
          `${repo.owner.login}/${repo.name}`,
        ),
    });
  }

  if (selectedItem?.kind === "org") {
    const org = selectedItem.data;
    actions.push({
      id: "secondaryAction",
      label: "Browse organization",
      run: () =>
        state.goTo({ to: "org", params: { name: org.login } }, org.login),
    });
  }

  const searchItem = [selectedItem, parentItem].find((item) =>
    item?.supportGithubSearch(),
  );
  const owner = searchItem?.owner();
  if (searchItem && owner) {
    const repo = searchItem.kind === "repo" ? searchItem.data.name : undefined;
    actions.push({
      id: "codeSearch",
      label: "Code search",
      run: () => {
        state.clearFilter();
        state.goTo({ to: "search", params: { owner, repo } });
      },
    });
  }

  return actions;
}
