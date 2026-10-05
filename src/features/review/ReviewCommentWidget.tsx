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

import { MarkdownBody } from "~/components/markdown-body";
import type { ReviewComment } from "~/models/code-review";

import { ActionButton, CollapseButton, StateIcon } from "./ActionButton";
import { AskAgentButton } from "./AskAgentButton";
import { CommentForm } from "./CommentForm";
import { store, useCodeReviewSnapshot } from "./store";
import { isPendingComment } from "./utils";

export const severityConfig = {
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
  id: string;
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
  id,
  comment,
  onDelete,
  onTogglePublish,
  onAskAgent,
  onEdit,
}: ReviewCommentWidgetProps) {
  const snapshot = useCodeReviewSnapshot();
  const editKey = `${id}:edit`;
  const isCollapsed = !!snapshot.collapsed[id];
  const config =
    severityConfig[comment.severity as keyof typeof severityConfig] ??
    severityConfig.info;
  const Icon = config.icon;

  if (onEdit && editKey in snapshot.drafts) {
    return (
      <CommentForm
        label="Edit comment"
        defaultValue={store.draft(editKey)}
        submitLabel="Save"
        onChange={(text) => store.setDraft(editKey, text)}
        onSubmit={(text) => {
          store.clearDraft(editKey);
          onEdit(text);
        }}
        onCancel={() => store.clearDraft(editKey)}
      />
    );
  }

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
          <ActionButton
            tooltip="Edit Comment"
            onClick={() => store.setDraft(editKey, comment.comment)}
          >
            <Pencil />
          </ActionButton>
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
        <CollapseButton id={id} isCollapsed={isCollapsed} />
      </div>
      {!isCollapsed && (
        <div className="mt-1 pl-5.5 text-foreground/80">
          <MarkdownBody content={comment.comment} />
        </div>
      )}
    </div>
  );
}
