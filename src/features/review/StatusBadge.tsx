import { cn } from "cn";

import type { GetSavedReviewRequest } from "~/models/code-review";

import { useLatestHeadShaQuery } from "./data-loader";
import { type ReviewProgress, type ReviewStatus, reviewStatus } from "./utils";

// tinted like the palette's review decision
const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; className: string; dotClassName: string }
> = {
  todo: {
    label: "Todo",
    className: "bg-warning/15 text-warning",
    dotClassName: "bg-warning",
  },
  inProgress: {
    label: "In progress",
    className: "bg-primary/15 text-primary",
    dotClassName: "bg-primary",
  },
  approved: {
    label: "Approved",
    className: "bg-success/15 text-success",
    dotClassName: "bg-success",
  },
  changesRequested: {
    label: "Change requested",
    className: "bg-destructive/15 text-destructive",
    dotClassName: "bg-destructive",
  },
  commented: {
    label: "Feedback submitted",
    className: "bg-info/15 text-info",
    dotClassName: "bg-info",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReviewStatus;
  className?: string;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "flex min-w-fit shrink-0 items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", config.dotClassName)} />
      {config.label}
    </span>
  );
}

/** Status of the open pull request, a new commit takes it back from submitted. */
export function LiveStatusBadge({
  review,
  className,
}: {
  review: GetSavedReviewRequest & ReviewProgress;
  className?: string;
}) {
  const { data: latestHeadSha } = useLatestHeadShaQuery(review);

  return (
    <StatusBadge
      status={reviewStatus(review, latestHeadSha)}
      className={className}
    />
  );
}
