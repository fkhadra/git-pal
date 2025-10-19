import { cn } from "~/libs/utils";
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
				"ml-auto min-w-fit rounded-md border bg-zinc-800 px-2 py-1 text-sm capitalize",
				value === "APPROVED" && "border-success text-success",
				value === "REVIEW_REQUIRED" && "border-info text-info",
				value === "CHANGES_REQUESTED" && "border-warning text-warning",
			)}
		>
			{typeof value === "string" && value.toLowerCase().replace("_", " ")}
		</span>
	);
}
