import type { ViewType } from "react-diff-view";
import { proxy, useSnapshot } from "valtio";

import type {
  GetSavedReviewRequest,
  ReviewListEntry,
} from "~/models/code-review";

import { isSameReview } from "./utils";

type RefreshStatus = "idle" | "checking" | "no-changes";

interface State {
  selectedFile: string | null;
  selectedReview: ReviewListEntry | null;
  requestedReview: GetSavedReviewRequest | null;
  viewType: ViewType;
  refreshStatus: RefreshStatus;
  isSubmitOpen: boolean;
}

const state = proxy<State>({
  selectedFile: null,
  selectedReview: null,
  requestedReview: null,
  viewType: "split",
  refreshStatus: "idle",
  isSubmitOpen: false,
});

// view picked by the user, restored once a narrow diff widens again
let isNarrow = false;
let preferredViewType: ViewType = state.viewType;

export const store = {
  selectFile(file: string) {
    state.selectedFile = file;
  },
  selectReview(review: ReviewListEntry) {
    const current = state.selectedReview;
    if (!current || !isSameReview(current, review)) {
      state.selectedFile = null;
    }

    state.selectedReview = review;
    state.requestedReview = null;
  },
  requestReview(review: GetSavedReviewRequest) {
    state.requestedReview = review;
  },
  // select the requested review once listed, keep the selection fresh, default to the latest
  syncReviews(reviews: ReviewListEntry[]) {
    const target = state.requestedReview ?? state.selectedReview;

    if (!target) {
      if (reviews[0]) store.selectReview(reviews[0]);
      return;
    }

    const match = reviews.find((r) => isSameReview(r, target));
    if (match) store.selectReview(match);
  },
  clearReview(review: GetSavedReviewRequest) {
    if (!state.selectedReview || !isSameReview(state.selectedReview, review)) {
      return;
    }

    state.selectedReview = null;
    state.selectedFile = null;
  },
  toggleViewType() {
    if (state.viewType === "split") {
      state.viewType = "unified";
      return;
    }

    state.viewType = "split";
  },
  /** Narrow diffs switch to unified, split lines would wrap too much */
  fitViewType(narrow: boolean) {
    if (narrow === isNarrow) return;

    isNarrow = narrow;
    if (narrow) {
      preferredViewType = state.viewType;
      state.viewType = "unified";
      return;
    }

    state.viewType = preferredViewType;
  },
  toggleRefreshStatus(s: RefreshStatus) {
    state.refreshStatus = s;
  },
  setSubmitOpen(open: boolean) {
    state.isSubmitOpen = open;
  },
};

export function useCodeReviewSnapshot() {
  return useSnapshot(state);
}
