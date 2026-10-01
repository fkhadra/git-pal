import { ScrollText } from "lucide-react";
import { useState } from "react";

import { HarnessLogo, reviewedBy } from "~/components/harness";
import { MarkdownBody } from "~/components/markdown-body";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type { CodeReview } from "~/models/code-review";

import { WIDE_SHEET_CLASS } from "./utils";

const SEEN_KEY_PREFIX = "review:summary-seen";

function seenKey(review: CodeReview) {
  return `${SEEN_KEY_PREFIX}:${review.owner}/${review.repository}#${review.prNumber}`;
}

/** The AI review's summary in a sheet, a dot flags one not read yet. */
export function ReviewSummarySheet({ review }: { review: CodeReview }) {
  const [open, setOpen] = useState(false);
  // the review date tells summaries apart, re-reviews bring a new one
  const [seenAt, setSeenAt] = useState(() =>
    localStorage.getItem(seenKey(review)),
  );
  const isUnread = seenAt !== review.reviewedAt;

  const openSheet = () => {
    localStorage.setItem(seenKey(review), review.reviewedAt);
    setSeenAt(review.reviewedAt);
    setOpen(true);
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            onClick={openSheet}
          >
            <ScrollText className="text-primary" />
            {isUnread && (
              <span className="absolute top-1 right-1 size-2 rounded-full bg-brand-alt" />
            )}
          </Button>
        }
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className={WIDE_SHEET_CLASS}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <ScrollText className="size-4 shrink-0" />
              Review summary
              {review.harness && (
                <span
                  title={reviewedBy(review.harness, review.model)}
                  className="flex items-center gap-1 text-xs font-normal text-muted-foreground"
                >
                  <HarnessLogo harness={review.harness} />
                  {review.model}
                </span>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-4">
            <MarkdownBody content={review.summary} />
          </div>
        </SheetContent>
      </Sheet>
      <TooltipContent>Review summary</TooltipContent>
    </Tooltip>
  );
}
