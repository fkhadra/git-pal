import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";
import { ThinkingOrb } from "thinking-orbs";

import { HarnessName, useDefaultHarness } from "~/components/harness";
import { ShortcutTooltip } from "~/components/shortcut-tooltip";
import { SlidingContent } from "~/components/sliding-content";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import type { ReviewEvent } from "~/models";
import type { CodeReview } from "~/models/code-review";

import { useSubmitReviewMutation } from "./data-loader";
import { useKeybind } from "./shortcuts";
import { store, useCodeReviewSnapshot } from "./store";
import { isPendingComment } from "./utils";

const EVENTS: { value: ReviewEvent; label: string; description: string }[] = [
  {
    value: "COMMENT",
    label: "Comment",
    description: "Submit general feedback without explicit approval.",
  },
  {
    value: "APPROVE",
    label: "Approve",
    description: "Give your approval to merge these changes.",
  },
  {
    value: "REQUEST_CHANGES",
    label: "Request changes",
    description: "Submit feedback that must be addressed before merging.",
  },
];

interface Props {
  review?: CodeReview;
  /** Head commit the displayed diff belongs to */
  commitId?: string;
  isReviewing?: boolean;
  /** Secondary while another action is the next step */
  variant?: "default" | "secondary";
}

export function SubmitReviewButton({
  review,
  commitId,
  isReviewing,
  variant = "default",
}: Props) {
  const snapshot = useCodeReviewSnapshot();
  const keybind = useKeybind();
  const [body, setBody] = useState("");
  const [event, setEvent] = useState<ReviewEvent>("COMMENT");
  const { mutateAsync, isPending } = useSubmitReviewMutation();
  const defaultHarness = useDefaultHarness();

  const pending = review?.comments.filter(isPendingComment) ?? [];
  const isEmpty = event === "COMMENT" && !body.trim() && pending.length === 0;

  async function submit() {
    if (!review || !commitId) return;

    try {
      await mutateAsync({ review, commitId, body, event });
      toast.success("Review submitted");
      setBody("");
      setEvent("COMMENT");
      store.setSubmitOpen(false);
    } catch (error) {
      toast.error(String(error));
    }
  }

  return (
    <Popover open={snapshot.isSubmitOpen} onOpenChange={store.setSubmitOpen}>
      <ShortcutTooltip shortcut={keybind.toggleSubmit}>
        <PopoverTrigger
          render={
            <Button
              variant={variant}
              size="xs"
              disabled={!review || !commitId || isReviewing}
            >
              {isReviewing ? (
                <>
                  <ThinkingOrb state="solving" size={20} />
                  Reviewing with
                  <HarnessName harness={review?.harness ?? defaultHarness} />
                </>
              ) : (
                <>
                  <Send />
                  Submit review
                  {pending.length > 0 && (
                    <span className="rounded-full bg-current/20 px-1.5 text-xs">
                      {pending.length}
                    </span>
                  )}
                </>
              )}
            </Button>
          }
        />
      </ShortcutTooltip>
      <PopoverContent align="end" className="flex w-96 flex-col gap-3">
        <span className="text-sm font-medium">Finish your review</span>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Leave a comment"
          rows={4}
        />
        <RadioGroup
          value={event}
          onValueChange={(value) => setEvent(value as ReviewEvent)}
        >
          {EVENTS.map((e) => (
            <label key={e.value} className="flex cursor-pointer gap-2">
              <RadioGroupItem value={e.value} className="mt-0.5" />
              <span className="flex flex-col">
                <span className="text-sm">{e.label}</span>
                <span className="text-xs text-muted-foreground">
                  {e.description}
                </span>
              </span>
            </label>
          ))}
        </RadioGroup>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {pending.length} pending comment{pending.length === 1 ? "" : "s"}
          </span>
          <Button
            size="sm"
            disabled={isEmpty || isPending}
            className="relative overflow-hidden"
            onClick={submit}
          >
            <SlidingContent
              toggle={isPending}
              from="Submit review"
              to={<Spinner className="size-4" />}
            />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
