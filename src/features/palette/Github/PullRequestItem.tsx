import { GitBranch } from "lucide-react";
import type { PullRequest } from "~/models";
import { Container } from "../Layout";
import { PullRequestStatus } from "./PullRequestStatus";
import { ReviewDecision } from "./ReviewDecision";

interface Props {
  pullRequest: PullRequest;
  hideAvatar?: boolean;
}

export function PullRequestItem({ pullRequest, hideAvatar }: Props) {
  return (
    <Container>
      <PullRequestStatus pullRequest={pullRequest} />

      <div className="flex flex-col">
        <span>{pullRequest.title}</span>
        <div className="text-muted-foreground flex items-center gap-1 text-xs group-data-[selected=true]:text-white">
          <span>
            {pullRequest.repository.owner.login}/{pullRequest.repository.name}
          </span>
          <GitBranch className="size-3" />
          <span>{pullRequest.baseRefName}</span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ReviewDecision value={pullRequest.reviewDecision} />
        {!hideAvatar && (
          <img
            alt={pullRequest.author?.login}
            className="size-6 rounded-full"
            src={pullRequest.author?.avatarUrl}
          />
        )}
      </div>
    </Container>
  );
}
