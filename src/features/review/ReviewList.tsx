import { cn } from "cn";
import {
  AlertCircle,
  AlertTriangle,
  List,
  Loader2,
  MessageSquare,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { ThinkingOrb } from "thinking-orbs";

import {
  HARNESS_LABELS,
  HarnessLogo,
  reviewedBy,
  useDefaultHarness,
} from "~/components/harness";
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
import { Checkbox } from "~/components/ui/checkbox";
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
  useDeleteReviewsMutation,
  useIsReviewing,
  useReviewingJobIds,
  useSavedReviewsQuery,
} from "./data-loader";
import { PrUrlInput } from "./PrUrlInput";
import { LiveStatusBadge, StatusBadge } from "./StatusBadge";
import { store, useCodeReviewSnapshot } from "./store";
import { isSameReview, reviewJobId, reviewStatus } from "./utils";

function commentLabel(count: number) {
  const noun = count === 1 ? "comment" : "comments";

  return `${count} ${noun}`;
}

function ReviewItem({
  entry,
  isSelected,
  isChecked,
  isSelecting,
  onCheck,
}: {
  entry: ReviewListEntry;
  isSelected: boolean;
  isChecked: boolean;
  /** Some reviews are checked, every checkbox shows */
  isSelecting: boolean;
  onCheck: (checked: boolean) => void;
}) {
  const isReviewing = useIsReviewing(entry);
  const defaultHarness = useDefaultHarness();
  const harnessLabel = HARNESS_LABELS[entry.harness ?? defaultHarness];
  const progress = { ...entry, noteCount: entry.commentCount, isReviewing };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => store.selectReview(entry)}
      onKeyDown={(e) => e.key === "Enter" && store.selectReview(entry)}
      className={cn(
        "group/item flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent/60 overflow-hidden",
        isSelected && "bg-accent hover:bg-accent",
      )}
    >
      <Checkbox
        aria-label="Select review"
        checked={isChecked}
        disabled={isReviewing}
        onCheckedChange={onCheck}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100",
          isSelecting && "opacity-100",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{entry.prTitle}</div>
        <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
          {entry.owner}/{entry.repository} #{entry.prNumber}
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {isSelected ? (
            <LiveStatusBadge review={progress} />
          ) : (
            <StatusBadge status={reviewStatus(progress)} />
          )}
          {/* <span>
            {entry.reviewed
              ? formatDistanceToNow(new Date(entry.reviewedAt), {
                  addSuffix: true,
                })
              : "Not reviewed"}
          </span> */}
          {entry.reviewed && (
            <span
              title={commentLabel(entry.commentCount)}
              className="flex items-center gap-1"
            >
              <MessageSquare className="size-3" />
              {entry.commentCount}
            </span>
          )}
          {entry.reviewed && entry.harness && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <span className="flex items-center">
                    <HarnessLogo harness={entry.harness} className="size-3" />
                  </span>
                }
              />
              <TooltipContent>
                {reviewedBy(entry.harness, entry.model)}
              </TooltipContent>
            </Tooltip>
          )}
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
            <TooltipContent>Reviewing with {harnessLabel}…</TooltipContent>
          </Tooltip>
        }
        toggle={isReviewing}
      />
    </div>
  );
}

const reviewKey = (e: ReviewListEntry) =>
  `${e.owner}/${e.repository}/${e.prNumber}`;

interface Props {
  prUrlRef?: React.Ref<HTMLInputElement>;
}

export function ReviewList({ prUrlRef }: Props) {
  const { data, isLoading } = useSavedReviewsQuery();
  const [reviewFilter, setReviewFilter] = useState("");
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(new Set());
  const snapshot = useCodeReviewSnapshot();
  const reviewingJobIds = useReviewingJobIds();

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

  // only visible reviews count, a filter hides the others from bulk actions
  const checkedReviews = filteredReviews.filter((e) =>
    checkedKeys.has(reviewKey(e)),
  );
  const checkableReviews = filteredReviews.filter(
    (e) => !reviewingJobIds.has(reviewJobId(e)),
  );

  const toggleCheck = (entry: ReviewListEntry, checked: boolean) => {
    const next = new Set(checkedKeys);
    if (checked) next.add(reviewKey(entry));
    else next.delete(reviewKey(entry));

    setCheckedKeys(next);
  };

  const toggleAll = (checked: boolean) => {
    const keys = checked ? checkableReviews.map(reviewKey) : [];
    setCheckedKeys(new Set(keys));
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <PrUrlInput inputRef={prUrlRef} />
      </div>
      {checkedReviews.length > 0 ? (
        <BulkActions
          reviews={checkedReviews}
          isAllChecked={checkedReviews.length === checkableReviews.length}
          onToggleAll={toggleAll}
          onDeleted={() => setCheckedKeys(new Set())}
        />
      ) : (
        <div className="flex items-center gap-2 px-4 pt-3 pb-1">
          <List className="size-3.5 text-muted-foreground" />
          <span className="flex-1 text-xs font-medium text-muted-foreground">
            Reviews
          </span>
        </div>
      )}
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
            isChecked={checkedKeys.has(reviewKey(entry))}
            isSelecting={checkedReviews.length > 0}
            onCheck={(checked) => toggleCheck(entry, checked)}
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

function reviewLabel(count: number) {
  const noun = count === 1 ? "review" : "reviews";

  return `${count} ${noun}`;
}

function BulkActions({
  reviews,
  isAllChecked,
  onToggleAll,
  onDeleted,
}: {
  reviews: ReviewListEntry[];
  isAllChecked: boolean;
  onToggleAll: (checked: boolean) => void;
  onDeleted: () => void;
}) {
  const { mutateAsync: deleteReviews, isPending } = useDeleteReviewsMutation();

  const remove = async () => {
    try {
      await deleteReviews(reviews.map((review) => review.id));
      reviews.forEach(store.clearReview);
      onDeleted();
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <div className="flex items-center gap-2 px-5 pt-2">
      <Checkbox
        aria-label="Select all reviews"
        checked={isAllChecked}
        onCheckedChange={onToggleAll}
      />
      <span className="flex-1 text-xs text-muted-foreground">
        {reviews.length} selected
      </span>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="xs"
              className="text-destructive"
              disabled={isPending}
            >
              <Trash2 />
              Delete
            </Button>
          }
        />
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {reviewLabel(reviews.length)}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected reviews. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {!isPending && <AlertDialogCancel>Cancel</AlertDialogCancel>}
            <AlertDialogAction
              variant="destructive"
              className="relative overflow-hidden"
              onClick={remove}
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
      <Button
        variant="ghost"
        size="icon-xs"
        title="Clear selection"
        onClick={() => onToggleAll(false)}
      >
        <X />
      </Button>
    </div>
  );
}

function DeleteReviewButton({ entry }: { entry: ReviewListEntry }) {
  const { mutateAsync: deleteReviews, isPending } = useDeleteReviewsMutation();

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
                await deleteReviews([entry.id]);
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
