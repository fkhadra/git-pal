import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";

import commands from "~/commands";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type {
  CodeReview,
  GetSavedReviewRequest,
  TemplateChoice,
} from "~/models/code-review";

import { useReviewMutation } from "./data-loader";
import { AUTO_TEMPLATE, ReviewButton } from "./ReviewButton";
import { SubmitReviewButton } from "./SubmitReviewButton";

function useRestartReview(review: GetSavedReviewRequest) {
  const { mutateAsync, isPending } = useReviewMutation();

  const restart = async (template: TemplateChoice = AUTO_TEMPLATE) => {
    try {
      await mutateAsync({
        owner: review.owner,
        repository: review.repository,
        prNumber: review.prNumber,
        template,
      });
    } catch (e) {
      toast.error(String(e));
    }
  };

  return { restart, isPending };
}

export function CancelReviewButton({
  review,
}: {
  review: GetSavedReviewRequest;
}) {
  const queryClient = useQueryClient();

  const cancel = async () => {
    try {
      await commands.cancelReview({
        owner: review.owner,
        repository: review.repository,
        prNumber: review.prNumber,
      });
      queryClient.invalidateQueries({ queryKey: ["saved-review"] });
    } catch (e) {
      toast.error(String(e));
    }
  };

  return (
    <Button variant="destructive" size="xs" onClick={cancel}>
      Cancel
    </Button>
  );
}

export function RestartReviewButton({
  review,
}: {
  review: GetSavedReviewRequest;
}) {
  const { restart, isPending } = useRestartReview(review);

  return (
    <ReviewButton
      owner={review.owner}
      repository={review.repository}
      prNumber={review.prNumber}
      variant="default"
      size="xs"
      isPending={isPending}
      onReview={restart}
    />
  );
}

export function ReviewErrorButton({
  review,
  error,
}: {
  review: GetSavedReviewRequest;
  error: string;
}) {
  const { restart, isPending } = useRestartReview(review);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="destructive" size="xs">
            <CircleAlert />
            View Error
          </Button>
        }
      />
      <PopoverContent align="end" className="flex w-96 flex-col gap-3">
        <span className="text-sm font-medium">Review failed</span>
        <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs whitespace-pre-wrap">
          {error}
        </pre>
        <Button
          size="sm"
          className="self-end"
          disabled={isPending}
          onClick={() => restart()}
        >
          <RotateCcw />
          Retry
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function nextStep(review: CodeReview) {
  if (review.error) {
    return <ReviewErrorButton review={review} error={review.error} />;
  }

  if (review.cancelled || !review.reviewed) {
    return <RestartReviewButton review={review} />;
  }

  return null;
}

export function ReviewPrimaryAction({
  review,
  commitId,
  isReviewing,
}: {
  review?: CodeReview;
  commitId: string;
  isReviewing: boolean;
}) {
  const step = review && !isReviewing ? nextStep(review) : null;

  return (
    <>
      {step}
      <SubmitReviewButton
        review={review}
        commitId={commitId}
        isReviewing={isReviewing}
        variant={step ? "secondary" : "default"}
      />
    </>
  );
}
