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

function isRewritten(comparison?: CommitComparison) {
  return comparison?.status !== "ahead";
}

function outdatedMessage(comparison?: CommitComparison) {
  if (!comparison || isRewritten(comparison)) {
    return "The branch history was rewritten since the last review";
  }

  const noun = comparison.aheadBy === 1 ? "commit" : "commits";

  return `${comparison.aheadBy} new ${noun} since the last review`;
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
  const { data: latestHeadSha = headSha } = useLatestHeadShaQuery(review);
  const { data: comparison, isLoading } = useNewCommitsQuery(
    review,
    latestHeadSha,
  );
  const { mutateAsync, isPending } = useReviewMutation();

  if (!review.reviewed || review.headSha === latestHeadSha) return null;
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

  return (
    <div className="flex items-center gap-2 border-b bg-info/10 px-4 py-2 text-sm">
      <GitCommitHorizontal className="size-4 shrink-0 text-info" />
      <span className="flex-1">{outdatedMessage(comparison)}</span>
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
