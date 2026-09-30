import { cn } from "cn";
import { AlertCircle, Check, Send } from "lucide-react";
import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { ReviewStatus } from "~/models/code-review";

import { useUpdateReviewStatusMutation } from "./data-loader";
import { useCodeReviewSnapshot } from "./store";

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  Todo: {
    label: "Todo",
    className: "text-warning",
    icon: <AlertCircle className="size-4" />,
  },
  Done: {
    label: "Done",
    className: "text-success ",
    icon: <Check className="size-4" />,
  },
  Submitted: {
    label: "Submitted",
    className: "text-info ",
    icon: <Send className="size-4" />,
  },
};

export function ReviewStatusSelector({
  initialStatus,
}: {
  initialStatus?: ReviewStatus;
}) {
  const snapshot = useCodeReviewSnapshot();

  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(
    initialStatus || "Todo",
  );
  const { mutateAsync } = useUpdateReviewStatusMutation();

  return (
    <Select
      value={reviewStatus}
      onValueChange={async (val) => {
        const status = val as ReviewStatus;
        setReviewStatus(status);

        if (!snapshot.selectedReview) return;

        try {
          await mutateAsync({
            owner: snapshot.selectedReview.owner,
            prNumber: snapshot.selectedReview.prNumber,
            repository: snapshot.selectedReview.repository,
            status,
          });
        } catch (error) {
          console.error(error);
        }
      }}
    >
      <SelectTrigger
        size="sm"
        className="h-7 gap-1 border-none bg-transparent px-2 text-xs shadow-none hover:bg-accent dark:bg-transparent dark:hover:bg-accent"
      >
        <SelectValue>
          <span
            className={cn(
              STATUS_CONFIG[reviewStatus].className,
              "flex items-center gap-1",
            )}
          >
            {STATUS_CONFIG[reviewStatus].icon}
            {STATUS_CONFIG[reviewStatus].label}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {(["Todo", "Done", "Submitted"] as ReviewStatus[]).map((s) => (
          <SelectItem key={s} value={s} className="cursor-pointer">
            <span
              className={cn(
                STATUS_CONFIG[s].className,
                "flex items-center gap-1",
              )}
            >
              {STATUS_CONFIG[s].icon}
              {STATUS_CONFIG[s].label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
