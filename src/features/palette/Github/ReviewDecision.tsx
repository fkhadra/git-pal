import { cn } from "cn";

import type { PullRequestReviewDecision } from "~/models";

export function ReviewDecision({
  value,
}: {
  value: PullRequestReviewDecision | null;
}) {
  if (!value) return;

  return (
    <span
      className={cn(
        "ml-auto min-w-fit rounded-md border bg-muted px-2 py-1 text-sm capitalize",
        value === "APPROVED" && "border-success text-success",
        value === "REVIEW_REQUIRED" && "border-info text-info",
        value === "CHANGES_REQUESTED" && "border-warning text-warning",
        "group-data-[selected=true]:border-primary-foreground/40 group-data-[selected=true]:bg-primary-foreground/15 group-data-[selected=true]:text-primary-foreground",
      )}
    >
      {typeof value === "string" && value.toLowerCase().replace("_", " ")}
    </span>
  );
}
