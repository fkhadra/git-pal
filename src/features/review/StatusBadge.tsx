import { AlertCircle, Check, Send } from "lucide-react";

import type { ReviewStatus } from "~/models/code-review";

const STATUS_CONFIG: Record<
  ReviewStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  Todo: {
    label: "Todo",
    className: "text-warning",
    icon: <AlertCircle className="size-3" />,
  },
  Done: {
    label: "Done",
    className: "text-success ",
    icon: <Check className="size-3" />,
  },
  Submitted: {
    label: "Submitted",
    className: "text-info ",
    icon: <Send className="size-3" />,
  },
};

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
