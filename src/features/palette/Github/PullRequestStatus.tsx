import {
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
  OctagonAlert,
} from "lucide-react";
import { Spinner } from "~/components/Spinner";
import { PullRequest } from "~/models";
import { IconWrapper } from "./Layout";

export function PullRequestStatus({
  pullRequest,
}: {
  pullRequest: PullRequest;
}) {
  let component: React.ReactNode;

  if (pullRequest.isDraft) {
    component = <GitPullRequestDraft />;
  } else if (
    pullRequest.isInMergeQueue ||
    pullRequest.statusCheckRollup?.state === "PENDING"
  ) {
    component = <Spinner />;
  } else if (pullRequest.state === "MERGED") {
    component = <GitPullRequest className="text-purple-500" />;
  } else if (
    pullRequest.statusCheckRollup?.state === "ERROR" ||
    pullRequest.statusCheckRollup?.state === "FAILURE"
  ) {
    component = <GitPullRequestClosed className="text-alert" />;
  } else if (pullRequest.mergeable === "CONFLICTING") {
    component = <OctagonAlert className="text-warning" />;
  } else if (pullRequest.reviewDecision === "CHANGES_REQUESTED") {
    component = <GitPullRequest className="text-warning" />;
  } else if (pullRequest.mergeable === "MERGEABLE") {
    component = <GitPullRequest className="text-success size-5" />;
  }

  return <IconWrapper>{component}</IconWrapper>;
}
