import { openUrl as open } from "@tauri-apps/plugin-opener";
import { toast } from "react-toastify";

import commands from "~/commands";
import type { PullRequest } from "~/models";
import type {
  GetSavedReviewRequest,
  TemplateChoice,
} from "~/models/code-review";

import { state } from "./state";

/** Starts the review then shows it in the review window. */
export async function reviewPullRequest(
  review: GetSavedReviewRequest,
  template: TemplateChoice,
) {
  try {
    await commands.reviewPullRequest({ ...review, template });
    await commands.showReview(review);
  } catch (error) {
    toast.error(String(error));
  }
}

/** Shows the pull request in the review window, the user decides whether to review. */
export async function viewPullRequest(pr: PullRequest) {
  const review = {
    owner: pr.repository.owner.login,
    repository: pr.repository.name,
    prNumber: pr.number,
  };
  // already known, the window opens without fetching the pull request
  const summary = {
    title: pr.title,
    branch: pr.headRefName,
    headSha: pr.headRefOid,
  };

  try {
    await commands.viewPullRequest(review, summary);
    state.resetPalette();
  } catch (error) {
    toast.error(String(error));
  }
}

export function openUrl(url: string) {
  open(url).finally(() => {
    setTimeout(() => {
      state.resetPalette();
    }, 250);
  });
}
