import { cn } from "cn";

import type { PullRequestReviewDecision } from "~/models";

type Decision = Extract<PullRequestReviewDecision, string>;

const DOT_COLORS: Record<Decision, string> = {
  APPROVED: "bg-success",
  REVIEW_REQUIRED: "bg-info",
  CHANGES_REQUESTED: "bg-warning",
};

function toLabel(value: Decision) {
  const words = value.toLowerCase().replace("_", " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function ReviewDecision({
  value,
}: {
  value: PullRequestReviewDecision | null;
}) {
  if (!value || typeof value !== "string") return;

  return (
    <span
      className={cn(
        "ml-auto flex min-w-fit items-center gap-1.5 rounded-md px-1.5 py-0.5 text-xs font-medium",
        value === "APPROVED" && "bg-success/15 text-success",
        value === "REVIEW_REQUIRED" && "bg-info/15 text-info",
        value === "CHANGES_REQUESTED" && "bg-warning/15 text-warning",
        "group-data-[selected=true]:bg-primary-foreground/15 group-data-[selected=true]:text-primary-foreground",
      )}
    >
      <span className={cn("size-1.5 rounded-full", DOT_COLORS[value])} />
      {toLabel(value)}
    </span>
  );
}
