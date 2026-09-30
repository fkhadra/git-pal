import { openUrl } from "@tauri-apps/plugin-opener";
import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import { ChevronRight, ExternalLink, MessagesSquare } from "lucide-react";
import { useMemo, useState } from "react";

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
import type { GetSavedReviewRequest } from "~/models/code-review";
import type {
  CommentKind,
  PullRequestConversation,
} from "~/models/conversation";

import { useDescriptionQuery } from "./data-loader";
import { EditableComment } from "./EditableComment";
import { WIDE_SHEET_CLASS } from "./utils";

const DECISION_STATES = ["APPROVED", "CHANGES_REQUESTED"];

const REVIEW_STATES: Record<string, { label: string; className: string }> = {
  APPROVED: { label: "approved", className: "text-success" },
  CHANGES_REQUESTED: {
    label: "requested changes",
    className: "text-destructive",
  },
  COMMENTED: { label: "reviewed", className: "text-muted-foreground" },
  DISMISSED: { label: "review dismissed", className: "text-muted-foreground" },
};

interface Entry {
  key: string;
  kind: CommentKind;
  id: number;
  author: string;
  date: string;
  body: string;
  signedBody: string;
  htmlUrl: string;
  state?: string;
}

const byDate = (a: Entry, b: Entry) => a.date.localeCompare(b.date);

function reviewEntries(conversation: PullRequestConversation) {
  const reviews: Entry[] = conversation.reviews
    .filter((r) => r.submittedAt && REVIEW_STATES[r.state])
    .map((r) => ({
      key: `review-${r.id}`,
      kind: "review",
      id: r.id,
      author: r.author,
      date: r.submittedAt!,
      body: r.body,
      signedBody: r.signedBody,
      htmlUrl: r.htmlUrl,
      state: r.state,
    }));

  return reviews.sort(byDate);
}

function commentEntries(conversation: PullRequestConversation) {
  const comments: Entry[] = conversation.comments.map((c) => ({
    key: `comment-${c.id}`,
    kind: "issue",
    id: c.id,
    author: c.author,
    date: c.createdAt,
    body: c.body,
    signedBody: c.signedBody,
    htmlUrl: c.htmlUrl,
  }));

  return comments.sort(byDate);
}

function TimelineEntry({ entry }: { entry: Entry }) {
  const state = entry.state ? REVIEW_STATES[entry.state] : undefined;

  return (
    <div className="rounded-md border p-3 text-sm">
      <EditableComment
        kind={entry.kind}
        id={entry.id}
        author={entry.author}
        body={entry.body}
        signedBody={entry.signedBody}
        header={
          <>
            <span className="font-medium text-foreground">@{entry.author}</span>
            {state && (
              <span className={cn(state.className)}>{state.label}</span>
            )}
            <span>
              {formatDistanceToNow(new Date(entry.date), { addSuffix: true })}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="ml-auto"
              title="Open on GitHub"
              onClick={() => openUrl(entry.htmlUrl)}
            >
              <ExternalLink />
            </Button>
          </>
        }
      />
    </div>
  );
}

function ReviewsSection({ reviews }: { reviews: Entry[] }) {
  const [open, setOpen] = useState(false);

  const decisions = DECISION_STATES.map((state) => ({
    state,
    count: reviews.filter((r) => r.state === state).length,
  })).filter((d) => d.count > 0);

  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent/50"
      >
        <ChevronRight
          className={cn(
            "size-4 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="font-medium">Reviews</span>
        <span className="text-muted-foreground">{reviews.length}</span>
        <span className="ml-auto flex gap-3 text-xs">
          {decisions.map(({ state, count }) => (
            <span key={state} className={REVIEW_STATES[state].className}>
              {count} {REVIEW_STATES[state].label}
            </span>
          ))}
        </span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t p-2">
          {reviews.map((entry) => (
            <TimelineEntry key={entry.key} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
}

function DescriptionEntry({ body }: { body: string }) {
  return (
    <div className="rounded-md border border-l-2 border-l-primary p-3 text-sm">
      <span className="text-xs font-medium text-muted-foreground">
        Description
      </span>
      <MarkdownBody content={body} />
    </div>
  );
}

export function ConversationSheet({
  review,
  conversation,
  description,
}: {
  review: GetSavedReviewRequest;
  conversation?: PullRequestConversation;
  description?: string | null;
}) {
  const [open, setOpen] = useState(false);
  // needed for images on private repo
  const { data: signedDescription } = useDescriptionQuery(review, open);
  const shownDescription = signedDescription ?? description;
  const reviews = useMemo(
    () => (conversation ? reviewEntries(conversation) : []),
    [conversation],
  );
  const comments = useMemo(
    () => (conversation ? commentEntries(conversation) : []),
    [conversation],
  );
  const count = reviews.length + comments.length;

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative"
            disabled={!conversation}
            onClick={() => setOpen(true)}
          >
            <MessagesSquare className="text-info" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-info text-[10px] text-background">
                {count}
              </span>
            )}
          </Button>
        }
      />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className={WIDE_SHEET_CLASS}>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm">
              <MessagesSquare className="size-4 shrink-0" />
              Conversation
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-4">
            {shownDescription?.trim() && (
              <DescriptionEntry body={shownDescription} />
            )}
            {reviews.length > 0 && <ReviewsSection reviews={reviews} />}
            {count === 0 && (
              <p className="text-center text-sm text-muted-foreground">
                No conversation yet
              </p>
            )}
            {comments.map((entry) => (
              <TimelineEntry key={entry.key} entry={entry} />
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <TooltipContent>Conversation</TooltipContent>
    </Tooltip>
  );
}
