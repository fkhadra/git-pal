import { openUrl } from "@tauri-apps/plugin-opener";
import { formatDistanceToNow } from "date-fns";
import { ExternalLink, GitPullRequest } from "lucide-react";

import { Button } from "~/components/ui/button";
import type { InlineComment } from "~/models/conversation";

import { AskAgentButton } from "./AskAgentButton";
import { EditableComment } from "./EditableComment";
import { type InlineThread, isAnchored } from "./utils";

function threadLabel(thread: InlineThread) {
  const { root } = thread;
  if (root.isFileComment) return "File";
  if (!isAnchored(thread)) return "Outdated";
  if (root.startLine != null) return `Lines ${root.startLine}-${root.line}`;

  return `Line ${root.line}`;
}

function CommentBody({ comment }: { comment: InlineComment }) {
  return (
    <EditableComment
      kind="inline"
      id={comment.id}
      author={comment.author}
      body={comment.body}
      header={
        <>
          <span className="font-medium text-foreground">@{comment.author}</span>
          <span>
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
            })}
          </span>
        </>
      }
    />
  );
}

interface Props {
  thread: InlineThread;
  onAskAgent?: () => void;
}

export function GithubThreadWidget({ thread, onAskAgent }: Props) {
  return (
    <div className="mx-3 my-2 flex flex-col gap-2 rounded-lg border border-l-2 border-l-info bg-card p-3 text-xs shadow-sm">
      <div className="flex items-center gap-2">
        <GitPullRequest className="size-3.5 shrink-0 text-info" />
        <span className="font-medium text-info">GitHub</span>
        <span className="text-muted-foreground">{threadLabel(thread)}</span>
        <span className="ml-auto" />
        {onAskAgent && <AskAgentButton onClick={onAskAgent} />}
        <Button
          variant="ghost"
          size="icon-xs"
          title="Open on GitHub"
          onClick={() => openUrl(thread.root.htmlUrl)}
        >
          <ExternalLink />
        </Button>
      </div>
      <CommentBody comment={thread.root} />
      {thread.replies.map((reply) => (
        <div key={reply.id} className="border-l-2 border-border pl-2">
          <CommentBody comment={reply} />
        </div>
      ))}
    </div>
  );
}
