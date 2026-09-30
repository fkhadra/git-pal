import {
  getPullRequestStatus,
  STATUS_ICONS,
  STATUS_LABELS,
} from "~/features/palette/Github/PullRequestStatus";
import type { GetSavedReviewRequest } from "~/models/code-review";

import { usePullRequestStatusQuery } from "./data-loader";


export function PullRequestStatusBadge({
  review,
}: {
  review: GetSavedReviewRequest;
}) {
  const { data: pullRequest } = usePullRequestStatusQuery(review);
  const status = pullRequest && getPullRequestStatus(pullRequest);

  if (!status) return null;

  return (
    <span className="flex shrink-0 items-center gap-1 text-xs font-normal whitespace-nowrap text-muted-foreground [&_svg]:size-4">
      {STATUS_ICONS[status]}
      {STATUS_LABELS[status]}
    </span>
  );
}
