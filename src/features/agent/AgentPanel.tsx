import { SquarePen, X } from "lucide-react";
import { useEffect, useMemo } from "react";

import { AgentAvatar } from "~/components/agent-avatar";
import { Button } from "~/components/ui/button";
import type { CommentContext } from "~/models";
import type { PullRequestKey } from "~/models/agent";

import { ChatInput } from "./ChatInput";
import {
  useConversationsQuery,
  useMessagesQuery,
  useSendMessage,
} from "./data-loader";
import { HistoryPopover } from "./HistoryPopover";
import { type ChatMessage, MessageList } from "./MessageList";
import { agentStore, useAgentSnapshot } from "./store";
import { SuggestedPrompts } from "./SuggestedPrompts";

interface AgentPanelProps {
  pr: PullRequestKey | null;
  prTitle?: string;
  files: readonly string[];
  /** Review comments and GitHub threads the user can reference */
  comments: readonly CommentContext[];
  currentFile?: string;
  disabled?: boolean;
  onClose: () => void;
}

export function AgentPanel({
  pr,
  prTitle,
  files,
  comments,
  currentFile,
  disabled,
  onClose,
}: AgentPanelProps) {
  const snapshot = useAgentSnapshot();
  const { data: persisted = [] } = useMessagesQuery(snapshot.conversationId);
  const { data: conversations = [] } = useConversationsQuery(pr);
  const send = useSendMessage(pr, currentFile);
  const prKey = pr ? `${pr.owner}/${pr.repository}#${pr.prNumber}` : null;

  // conversations belong to a pull request
  useEffect(() => {
    agentStore.newChat();
  }, [prKey]);

  const messages = useMemo(() => {
    const list: ChatMessage[] = persisted.map((m) => ({
      key: `message-${m.id}`,
      role: m.role,
      blocks: m.blocks,
    }));

    const run = snapshot.run;
    if (!run) return list;

    list.push({
      key: "run-prompt",
      role: "user",
      blocks: [{ type: "text", text: run.prompt }],
    });
    if (run.blocks.length > 0) {
      list.push({ key: "run-reply", role: "assistant", blocks: run.blocks });
    }

    return list;
  }, [persisted, snapshot.run]);

  const conversation = conversations.find(
    (c) => c.id === snapshot.conversationId,
  );
  const title = conversation?.title ?? "Agent";
  const isEmpty = messages.length === 0 && !snapshot.error;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 border-b px-3 py-2">
        <AgentAvatar
          size={20}
          state={snapshot.run ? "working" : "default"}
          className="shrink-0"
        />
        <span className="min-w-0 flex-1 truncate text-sm font-medium">
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          title="New chat"
          disabled={!pr}
          onClick={agentStore.newChat}
        >
          <SquarePen />
        </Button>
        <HistoryPopover pr={pr} />
        <Button variant="ghost" size="icon-sm" title="Close" onClick={onClose}>
          <X />
        </Button>
      </div>

      {!pr && (
        <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
          Select a review to ask about it
        </div>
      )}

      {pr && (
        <>
          <div className="min-h-0 flex-1 overflow-hidden">
            {isEmpty ? (
              <div className="flex h-full flex-col justify-end">
                <p className="p-3 text-center text-xs text-muted-foreground">
                  The agent uses AI. Check for mistakes.
                </p>
                <SuggestedPrompts disabled={disabled} onSelect={send} />
              </div>
            ) : (
              <MessageList
                messages={messages}
                isRunning={!!snapshot.run}
                error={snapshot.error}
              />
            )}
          </div>
          <ChatInput
            harness={conversation?.harness}
            files={files}
            comments={comments}
            currentFile={currentFile}
            prTitle={prTitle}
            disabled={disabled}
            onSend={send}
          />
        </>
      )}
    </div>
  );
}
