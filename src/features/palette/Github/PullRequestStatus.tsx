import { IconWrapper } from "~/components/icon-wrapper";
import type { PullRequest } from "~/models";

import { PullRequestStatusIcon } from "./PullRequestStatusIcon";

export type PullRequestStatusKind = keyof typeof PullRequestStatusIcon;

export const STATUS_LABELS: Record<PullRequestStatusKind, string> = {
  Building: "Checks running",
  Draft: "Draft",
  Failed: "Checks failed",
  ChangesRequested: "Changes requested",
  Conflict: "Merge conflicts",
  Ready: "Ready to merge",
  Merged: "Merged",
};

export const STATUS_ICONS: Record<PullRequestStatusKind, React.ReactNode> = {
  Building: <PullRequestStatusIcon.Building />,
  Draft: <PullRequestStatusIcon.Draft />,
  Failed: <PullRequestStatusIcon.Failed />,
  ChangesRequested: <PullRequestStatusIcon.ChangesRequested />,
  Conflict: <PullRequestStatusIcon.Conflict />,
  Ready: <PullRequestStatusIcon.Ready />,
  Merged: <PullRequestStatusIcon.Merged />,
};

export function getPullRequestStatus(
  pullRequest: PullRequest,
): PullRequestStatusKind | undefined {
  const checks = pullRequest.statusCheckRollup?.state;

  if (pullRequest.isDraft) return "Draft";
  if (pullRequest.isInMergeQueue || checks === "PENDING") return "Building";
  if (pullRequest.state === "MERGED") return "Merged";
  if (checks === "ERROR" || checks === "FAILURE") return "Failed";
  if (pullRequest.mergeable === "CONFLICTING") return "Conflict";
  if (pullRequest.reviewDecision === "CHANGES_REQUESTED") {
    return "ChangesRequested";
  }
  if (pullRequest.mergeable === "MERGEABLE") return "Ready";
}

export function PullRequestStatus({
  pullRequest,
}: {
  pullRequest: PullRequest;
}) {
  const status = getPullRequestStatus(pullRequest);

  return <IconWrapper>{status && STATUS_ICONS[status]}</IconWrapper>;
}
