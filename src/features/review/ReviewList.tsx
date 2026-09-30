import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  AlertTriangle,
  List,
  Loader2,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ThinkingOrb } from "thinking-orbs";

import { SlidingContent } from "~/components/sliding-content";
import { Spinner } from "~/components/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/components/ui/input-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { templateManager } from "~/features/templates/store";
import type { ReviewListEntry } from "~/models/code-review";

import {
  useDeleteReviewMutation,
  useIsReviewing,
  useSavedReviewsQuery,
} from "./data-loader";
import { PrUrlInput } from "./PrUrlInput";
import { StatusBadge } from "./StatusBadge";
import { store, useCodeReviewSnapshot } from "./store";
import { isSameReview } from "./utils";

function commentLabel(count: number) {
  const noun = count === 1 ? "comment" : "comments";

  return `${count} ${noun}`;
}

function ReviewItem({
  entry,
  isSelected,
}: {
  entry: ReviewListEntry;
  isSelected: boolean;
}) {
  const isReviewing = useIsReviewing(entry);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => store.selectReview(entry)}
      onKeyDown={(e) => e.key === "Enter" && store.selectReview(entry)}
      className={cn(
        "group/item flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/60",
        isSelected && "bg-accent hover:bg-accent",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-sm">
            {entry.prTitle}
          </span>
          <StatusBadge status={entry.status} />
        </div>
        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {entry.owner}/{entry.repository} #{entry.prNumber}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span>
            {entry.reviewed
              ? formatDistanceToNow(new Date(entry.reviewedAt), {
                  addSuffix: true,
                })
              : "Not reviewed"}
          </span>
          {entry.reviewed && <span>{commentLabel(entry.commentCount)}</span>}
          {entry.errorCount > 0 && (
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="size-3" />
              {entry.errorCount}
            </span>
          )}
          {entry.warningCount > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="size-3" />
              {entry.warningCount}
            </span>
          )}
        </div>
      </div>
      <SlidingContent
        from={<DeleteReviewButton entry={entry} />}
        to={
          <Tooltip>
            <TooltipTrigger
              render={
                <Button size="icon-sm" variant="ghost" disabled>
                  <ThinkingOrb state="solving" size={20} />
                </Button>
              }
            />
            <TooltipContent>Reviewing...</TooltipContent>
          </Tooltip>
        }
        toggle={isReviewing}
      />
    </div>
  );
}

const reviewKey = (e: ReviewListEntry) =>
  `${e.owner}/${e.repository}/${e.prNumber}`;

export function ReviewList() {
  const { data, isLoading } = useSavedReviewsQuery();
  const [reviewFilter, setReviewFilter] = useState("");
  const snapshot = useCodeReviewSnapshot();

  useEffect(() => {
    if (data) store.syncReviews(data);
  }, [data, snapshot.requestedReview]);

  const filteredReviews = useMemo(() => {
    const reviews = data ?? [];
    if (!reviewFilter.trim()) return reviews;

    const q = reviewFilter.toLowerCase();
    return reviews.filter(
      (e) =>
        e.prTitle.toLowerCase().includes(q) ||
        e.repository.toLowerCase().includes(q) ||
        e.owner.toLowerCase().includes(q) ||
        String(e.prNumber).includes(q),
    );
  }, [data, reviewFilter]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <PrUrlInput />
      </div>
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <List className="size-3.5 text-muted-foreground" />
        <span className="flex-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Reviews
        </span>
      </div>
      <div className="px-3 py-2">
        <InputGroup>
          <InputGroupAddon align="inline-start">
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search reviews..."
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
          />
          {reviewFilter && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                size="icon-xs"
                onClick={() => setReviewFilter("")}
              >
                <X />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        )}
        {data?.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <span>No reviews yet</span>
          </div>
        )}
        {filteredReviews.map((entry) => (
          <ReviewItem
            key={reviewKey(entry)}
            entry={entry}
            isSelected={
              !!snapshot.selectedReview &&
              isSameReview(entry, snapshot.selectedReview)
            }
          />
        ))}
      </div>
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => templateManager.setOpen(true)}
        >
          <Settings2 />
          Manage templates…
        </Button>
      </div>
    </div>
  );
}

function DeleteReviewButton({ entry }: { entry: ReviewListEntry }) {
  const { mutateAsync: deleteReview, isPending } = useDeleteReviewMutation();

  return (
    <AlertDialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  disabled={isPending}
                  size="icon-sm"
                  className="relative shrink-0 overflow-hidden text-muted-foreground opacity-0 group-hover/item:opacity-100 hover:text-destructive focus-visible:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Delete review</TooltipContent>
      </Tooltip>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete review</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the review for{" "}
            <strong>
              {entry.owner}/{entry.repository} #{entry.prNumber}
            </strong>
            . This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          {!isPending && <AlertDialogCancel>Cancel</AlertDialogCancel>}
          <AlertDialogAction
            variant="destructive"
            className="relative overflow-hidden"
            onClick={async () => {
              try {
                await deleteReview({
                  owner: entry.owner,
                  repository: entry.repository,
                  prNumber: entry.prNumber,
                });
                store.clearReview(entry);
              } catch (error) {
                toast.error(String(error));
              }
            }}
          >
            <SlidingContent
              from={<span>Delete</span>}
              to={<Spinner className="size-4" />}
              toggle={isPending}
            />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
