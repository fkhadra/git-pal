import { cn } from "cn";
import {
  AlertCircle,
  AlertTriangle,
  CircleCheck,
  Clock,
  Info,
  MessageSquare,
  MessageSquareX,
  MessageSquarePlus,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import { MarkdownBody } from "~/components/markdown-body";
import type { ReviewComment } from "~/models/code-review";

import { ActionButton, StateIcon } from "./ActionButton";
import { AskAgentButton } from "./AskAgentButton";
import { EditCommentDialog } from "./EditCommentDialog";
import { isPendingComment } from "./utils";

const severityConfig = {
  error: {
    icon: AlertCircle,
    accent: "border-destructive/50",
    text: "text-destructive",
    label: "Error",
  },
  warning: {
    icon: AlertTriangle,
    accent: "border-warning/50",
    text: "text-warning",
    label: "Warning",
  },
  info: {
    icon: Info,
    accent: "border-info/50",
    text: "text-info",
    label: "Info",
  },
  user: {
    icon: MessageSquare,
    accent: "border-agent/50",
    text: "text-agent",
    label: "Note",
  },
} as const;

interface ReviewCommentWidgetProps {
  comment: ReviewComment;
  onDelete?: () => void;
  onTogglePublish?: () => void;
  onAskAgent?: () => void;
  onEdit?: (text: string) => void;
}

function rangeLabel({ line, startLine }: ReviewComment) {
  if (line == null) return "File";
  if (startLine != null) return `Lines ${startLine}-${line}`;

  return `Line ${line}`;
}

function PublishState({
  comment,
  onTogglePublish,
}: Pick<ReviewCommentWidgetProps, "comment" | "onTogglePublish">) {
  if (comment.posted) {
    return (
      <StateIcon tooltip="Posted to GitHub">
        <CircleCheck className="text-success" />
      </StateIcon>
    );
  }

  if (onTogglePublish) {
    return (
      <ActionButton
        tooltip={comment.publish ? "Remove from review" : "Add to review"}
        active={comment.publish}
        onClick={onTogglePublish}
      >
        {comment.publish ? <MessageSquareX /> : <MessageSquarePlus />}
      </ActionButton>
    );
  }

  if (isPendingComment(comment)) {
    return (
      <StateIcon tooltip="Posted with the next review">
        <Clock className="text-muted-foreground" />
      </StateIcon>
    );
  }

  return null;
}

export function ReviewCommentWidget({
  comment,
  onDelete,
  onTogglePublish,
  onAskAgent,
  onEdit,
}: ReviewCommentWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const config =
    severityConfig[comment.severity as keyof typeof severityConfig] ??
    severityConfig.info;
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "mx-3 my-2 rounded-lg border bg-card p-3 text-xs shadow-sm",
        config.accent,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("size-3.5 shrink-0", config.text)} />
        <span className={cn("font-medium", config.text)}>{config.label}</span>
        <span className="text-muted-foreground">{rangeLabel(comment)}</span>
        <span className="ml-auto" />
        {onEdit && (
          <>
            <ActionButton
              tooltip="Edit Comment"
              onClick={() => setIsEditing(true)}
            >
              <Pencil />
            </ActionButton>
            <EditCommentDialog
              open={isEditing}
              title="Edit Comment"
              defaultValue={comment.comment}
              onOpenChange={setIsEditing}
              onSave={onEdit}
            />
          </>
        )}
        <PublishState comment={comment} onTogglePublish={onTogglePublish} />
        {onAskAgent && <AskAgentButton onClick={onAskAgent} />}
        {onDelete && (
          <ActionButton
            tooltip="Delete"
            className="hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 />
          </ActionButton>
        )}
      </div>
      <div className="mt-1 pl-5.5 text-foreground/80">
        <MarkdownBody content={comment.comment} />
      </div>
    </div>
  );
}
