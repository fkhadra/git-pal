import { cn } from "cn";
import { ChevronRight, Loader2, Wrench } from "lucide-react";
import { useState } from "react";
import { ThinkingOrb } from "thinking-orbs";

import { MarkdownBody } from "~/components/markdown-body";
import { Message, MessageContent } from "~/components/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "~/components/ui/message-scroller";
import type { Block } from "~/models/harness";

interface ChatMessage {
  key: string;
  role: "user" | "assistant";
  blocks: readonly Block[];
}

type ToolUse = Extract<Block, { type: "toolUse" }>;
type ToolResult = Extract<Block, { type: "toolResult" }>;

const SUMMARY_KEYS = ["description", "command", "file_path", "pattern", "path"];

/** Picks the most telling input field to describe a tool call. */
function toolSummary(input: ToolUse["input"]) {
  if (!input || typeof input !== "object") return "";

  for (const key of SUMMARY_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string") return value;
  }

  return "";
}

function ToolCall({ tool, result }: { tool: ToolUse; result?: ToolResult }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="my-1 rounded-md border text-xs">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "size-3 shrink-0 transition-transform",
            open && "rotate-90",
          )}
        />
        {result ? (
          <Wrench
            className={cn(
              "size-3 shrink-0",
              result.isError && "text-destructive",
            )}
          />
        ) : (
          <Loader2 className="size-3 shrink-0 animate-spin" />
        )}
        <span className="font-medium">{tool.name}</span>
        <span className="truncate font-mono">{toolSummary(tool.input)}</span>
      </button>
      {open && (
        <pre className="max-h-60 overflow-auto border-t bg-muted/30 p-2 font-mono text-[11px] whitespace-pre-wrap">
          {JSON.stringify(tool.input, null, 2)}
          {result && `\n\n${result.content}`}
        </pre>
      )}
    </div>
  );
}

function AssistantBlocks({ blocks }: { blocks: readonly Block[] }) {
  const results = new Map(
    blocks
      .filter((b): b is ToolResult => b.type === "toolResult")
      .map((b) => [b.toolUseId, b]),
  );

  return blocks.map((block, i) => {
    if (block.type === "text") {
      return <MarkdownBody key={i} content={block.text} />;
    }

    if (block.type === "toolUse") {
      return <ToolCall key={i} tool={block} result={results.get(block.id)} />;
    }

    return null;
  });
}

function UserMessage({ blocks }: { blocks: readonly Block[] }) {
  const text = blocks.map((b) => (b.type === "text" ? b.text : "")).join("\n");

  return (
    <div className="max-w-[85%] rounded-lg bg-muted px-3 py-2 whitespace-pre-wrap">
      {text}
    </div>
  );
}

export function MessageList({
  messages,
  isRunning,
  error,
}: {
  messages: ChatMessage[];
  isRunning: boolean;
  error: string | null;
}) {
  return (
    <MessageScrollerProvider autoScroll defaultScrollPosition="end">
      <MessageScroller>
        <MessageScrollerViewport>
          <MessageScrollerContent className="gap-4 p-3">
            {messages.map((message) => {
              const isUser = message.role === "user";

              return (
                <MessageScrollerItem
                  key={message.key}
                  messageId={message.key}
                  scrollAnchor={isUser}
                >
                  <Message align={isUser ? "end" : "start"}>
                    <MessageContent>
                      {isUser ? (
                        <UserMessage blocks={message.blocks} />
                      ) : (
                        <AssistantBlocks blocks={message.blocks} />
                      )}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              );
            })}
            {isRunning && (
              <MessageScrollerItem>
                <ThinkingOrb state="working" size={20} />
              </MessageScrollerItem>
            )}
            {error && (
              <MessageScrollerItem>
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {error}
                </div>
              </MessageScrollerItem>
            )}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  );
}

export type { ChatMessage };
