import { GitCommitHorizontal } from "lucide-react";
import { toast } from "react-toastify";

import { Button } from "~/components/ui/button";
import type { CommitComparison } from "~/models";
import type { CodeReview } from "~/models/code-review";

import {
  useLatestHeadShaQuery,
  useNewCommitsQuery,
  useReviewMutation,
} from "./data-loader";
import { useRefreshPullRequest } from "./useRefreshPullRequest";

function isRewritten(comparison?: CommitComparison) {
  return comparison?.status !== "ahead";
}

function outdatedMessage(isReviewed: boolean, comparison?: CommitComparison) {
  const since = isReviewed ? " since the last review" : "";
  if (!comparison || isRewritten(comparison)) {
    return `The branch history was rewritten${since}`;
  }

  const noun = comparison.aheadBy === 1 ? "commit" : "commits";

  return `${comparison.aheadBy} new ${noun}${since}`;
}

export function ReviewUpdateBanner({
  review,
  headSha,
  isReviewing,
}: {
  review: CodeReview;
  headSha: string;
  isReviewing: boolean;
}) {
  // a reviewed pull request compares with its review, otherwise with the shown diff
  const base = review.reviewed ? review.headSha : headSha;
  const { data: latestHeadSha = headSha } = useLatestHeadShaQuery(review);
  const { data: comparison, isLoading } = useNewCommitsQuery(
    review,
    base,
    latestHeadSha,
  );
  const { mutateAsync, isPending } = useReviewMutation();
  const { handleRefresh } = useRefreshPullRequest();

  if (base === latestHeadSha) return null;
  if (isReviewing || isLoading) return null;

  const rewritten = isRewritten(comparison);

  const startReview = async (incremental: boolean) => {
    try {
      await mutateAsync({
        owner: review.owner,
        repository: review.repository,
        prNumber: review.prNumber,
        template: { type: "auto" },
        incremental,
      });
    } catch (e) {
      toast.error(String(e));
    }
  };

  if (!review.reviewed) {
    return (
      <div className="flex items-center gap-2 border-b bg-info/10 px-4 py-2 text-sm">
        <GitCommitHorizontal className="size-4 shrink-0 text-info" />
        <span className="flex-1">{outdatedMessage(false, comparison)}</span>
        <Button size="xs" onClick={handleRefresh}>
          Reload
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 border-b bg-info/10 px-4 py-2 text-sm">
      <GitCommitHorizontal className="size-4 shrink-0 text-info" />
      <span className="flex-1">{outdatedMessage(true, comparison)}</span>
      {!rewritten && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => startReview(true)}
        >
          Review new commits
        </Button>
      )}
      <Button
        size="sm"
        variant={rewritten ? "default" : "outline"}
        disabled={isPending}
        onClick={() => startReview(false)}
      >
        Re-review everything
      </Button>
    </div>
  );
}
