import type { ViewType } from "react-diff-view";
import { proxy, useSnapshot } from "valtio";

import type {
  GetSavedReviewRequest,
  ReviewListEntry,
} from "~/models/code-review";

import { isSameReview } from "./utils";

type RefreshStatus = "idle" | "checking" | "no-changes";
export type FileView = "tree" | "list";

const FILE_VIEW_KEY = "review:file-view";
const DEFAULT_FILE_VIEW: FileView = "tree";

function savedFileView(): FileView {
  const saved = localStorage.getItem(FILE_VIEW_KEY);
  if (saved === "tree" || saved === "list") return saved;

  return DEFAULT_FILE_VIEW;
}

export interface Selection {
  hunkIndex: number;
  anchor: number;
  focus: number;
}

interface State {
  selectedFile: string | null;
  selectedReview: ReviewListEntry | null;
  requestedReview: GetSavedReviewRequest | null;
  viewType: ViewType;
  fileView: FileView;
  isOwnedOnly: boolean;
  refreshStatus: RefreshStatus;
  isSubmitOpen: boolean;
  drafts: Record<string, string>;
  selections: Record<string, Selection>;
  collapsed: Record<string, boolean>;
}

const state = proxy<State>({
  selectedFile: null,
  selectedReview: null,
  requestedReview: null,
  viewType: "split",
  fileView: savedFileView(),
  isOwnedOnly: false,
  refreshStatus: "idle",
  isSubmitOpen: false,
  drafts: {},
  selections: {},
  collapsed: {},
});

export function fileScope(review: GetSavedReviewRequest, file: string) {
  return `${review.owner}/${review.repository}#${review.prNumber}:${file}`;
}

export function fileDraftKey(scope: string) {
  return `${scope}:file`;
}

let isNarrow = false;
let preferredViewType: ViewType = state.viewType;

export const store = {
  selectFile(file: string) {
    state.selectedFile = file;
  },
  toggleOwnedOnly() {
    state.isOwnedOnly = !state.isOwnedOnly;
  },
  setFileView(view: FileView) {
    state.fileView = view;
    localStorage.setItem(FILE_VIEW_KEY, view);
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
  draft(key: string) {
    return state.drafts[key];
  },
  openDraft(key: string) {
    state.drafts[key] ??= "";
  },
  setDraft(key: string, text: string) {
    state.drafts[key] = text;
  },
  clearDraft(key: string) {
    delete state.drafts[key];
  },
  setSelection(scope: string, selection: Selection | null) {
    if (selection) {
      state.selections[scope] = selection;
      return;
    }

    delete state.selections[scope];
  },
  toggleCollapsed(key: string) {
    state.collapsed[key] = !state.collapsed[key];
  },
};

export function useCodeReviewSnapshot() {
  return useSnapshot(state);
}
