import type { PullRequest } from "~/models";
import { PullRequestStatusIcon } from "./PullRequestStatusIcon";
import { IconWrapper } from "~/components/icon-wrapper";

export function PullRequestStatus({
  pullRequest,
}: {
  pullRequest: PullRequest;
}) {
  let component: React.ReactNode;

  if (pullRequest.isDraft) {
    component = <PullRequestStatusIcon.Draft />;
  } else if (
    pullRequest.isInMergeQueue ||
    pullRequest.statusCheckRollup?.state === "PENDING"
  ) {
    component = <PullRequestStatusIcon.Building />;
  } else if (pullRequest.state === "MERGED") {
    component = <PullRequestStatusIcon.Merged />;
  } else if (
    pullRequest.statusCheckRollup?.state === "ERROR" ||
    pullRequest.statusCheckRollup?.state === "FAILURE"
  ) {
    component = <PullRequestStatusIcon.Failed />;
  } else if (pullRequest.mergeable === "CONFLICTING") {
    component = <PullRequestStatusIcon.Conflict />;
  } else if (pullRequest.reviewDecision === "CHANGES_REQUESTED") {
    component = <PullRequestStatusIcon.ChangesRequested />;
  } else if (pullRequest.mergeable === "MERGEABLE") {
    component = <PullRequestStatusIcon.Ready />;
  }

  return <IconWrapper>{component}</IconWrapper>;
}
