import { cn } from "cn";
import {
  AtSign,
  FileCode,
  GitPullRequest,
  MessageSquare,
  SendHorizontal,
  Square,
  X,
} from "lucide-react";
import { useRef, useState } from "react";

import commands from "~/commands";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import type { CommentContext } from "~/models";
import type { ContextItem } from "~/models/agent";
import type { Harness } from "~/models/harness";

import { useModelsQuery } from "./data-loader";
import { agentStore, useAgentSnapshot } from "./store";

const MENTION_TRIGGER = "@";

function basename(path: string) {
  return path.split("/").pop() ?? path;
}

function commentLabel({ path, line }: CommentContext) {
  const name = basename(path);

  return line == null ? name : `${name}:${line}`;
}

function contextKey(item: ContextItem) {
  if (item.type === "file") return `file:${item.path}`;
  if (item.type === "comment") {
    return `comment:${item.path}:${item.line}:${item.body}`;
  }

  return item.type;
}

function chipDetails(item: ContextItem, prTitle?: string) {
  const iconClass = "size-3 shrink-0 text-success";

  if (item.type === "file") {
    return {
      icon: <FileCode className={iconClass} />,
      label: basename(item.path),
      title: item.path,
    };
  }

  if (item.type === "comment") {
    return {
      icon: <MessageSquare className={iconClass} />,
      label: commentLabel(item),
      title: item.body,
    };
  }

  return {
    icon: <GitPullRequest className={iconClass} />,
    label: prTitle ?? "Pull request",
    title: prTitle,
  };
}

function ContextChip({
  item,
  prTitle,
  onRemove,
  muted,
}: {
  item: ContextItem;
  prTitle?: string;
  onRemove: () => void;
  muted?: boolean;
}) {
  const { icon, label, title } = chipDetails(item, prTitle);

  return (
    <span
      title={title}
      className={cn(
        "flex max-w-48 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs",
        muted && "border-dashed text-muted-foreground",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function ContextPicker({
  files,
  comments,
  onSelect,
  onClose,
}: {
  files: readonly string[];
  comments: readonly CommentContext[];
  onSelect: (item: ContextItem) => void;
  onClose: () => void;
}) {
  return (
    // keeps the input focused so blur doesn't close the picker before a click lands
    <Command
      className="absolute inset-x-0 bottom-full mb-2 h-auto max-h-64 border shadow-lg"
      onMouseDown={(e) => e.preventDefault()}
    >
      <CommandInput
        autoFocus
        placeholder="Add a file or comment..."
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        onBlur={onClose}
      />
      <CommandList>
        <CommandEmpty>No results</CommandEmpty>
        <CommandGroup heading="Files">
          {files.map((path) => (
            <CommandItem
              key={path}
              value={path}
              onSelect={() => onSelect({ type: "file", path })}
              className="min-h-7 text-xs"
            >
              <FileCode className="size-3.5! shrink-0" />
              <span className="truncate">{path}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {comments.length > 0 && (
          <CommandGroup heading="Comments">
            {comments.map((comment) => (
              <CommandItem
                key={contextKey(comment)}
                value={contextKey(comment)}
                onSelect={() => onSelect(comment)}
                className="min-h-7 text-xs"
              >
                <MessageSquare className="size-3.5! shrink-0" />
                <span className="shrink-0">{commentLabel(comment)}</span>
                <span className="truncate text-muted-foreground">
                  {comment.body}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );
}

interface ChatInputProps {
  /** Harness of the current conversation, the default one for a new chat */
  harness?: Harness;
  files: readonly string[];
  comments: readonly CommentContext[];
  currentFile?: string;
  prTitle?: string;
  disabled?: boolean;
  onSend: (prompt: string) => void;
}

/** Select value standing for the harness' default model. */
const DEFAULT_MODEL = "default";

function ModelSelect({ harness }: { harness?: Harness }) {
  const snapshot = useAgentSnapshot();
  const { data: models = [] } = useModelsQuery(harness);
  const options = [{ id: DEFAULT_MODEL, label: "Default" }, ...models];
  const value = snapshot.model ?? DEFAULT_MODEL;

  return (
    <Select
      value={value}
      onValueChange={(v) =>
        agentStore.setModel(v === DEFAULT_MODEL ? null : (v as string))
      }
    >
      <SelectTrigger
        size="sm"
        className="h-6 gap-1 border-none bg-transparent px-2 text-xs shadow-none"
      >
        <SelectValue>{options.find((m) => m.id === value)?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        {options.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ChatInput({
  harness,
  files,
  comments,
  currentFile,
  prTitle,
  disabled,
  onSend,
}: ChatInputProps) {
  const snapshot = useAgentSnapshot();
  const [value, setValue] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isRunning = !!snapshot.run;

  const showCurrentFile =
    !!currentFile &&
    !snapshot.context.some((c) => c.type === "file" && c.path === currentFile);

  function send() {
    if (disabled || isRunning || !value.trim()) return;

    onSend(value);
    setValue("");
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    if (next.endsWith(MENTION_TRIGGER) && next.length > value.length) {
      setShowPicker(true);
      setValue(next.slice(0, -MENTION_TRIGGER.length));
      return;
    }

    setValue(next);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey) return;

    e.preventDefault();
    send();
  }

  function closePicker() {
    setShowPicker(false);
    textareaRef.current?.focus();
  }

  function selectContext(item: ContextItem) {
    agentStore.addContext(item);
    closePicker();
  }

  function stop() {
    const id = agentStore.runningConversationId();
    if (id != null) commands.agentCancel(id);
  }

  return (
    <div className="relative m-3 mt-1 flex flex-col gap-2 rounded-xl border bg-card p-2 shadow-sm focus-within:border-primary/50">
      {showPicker && (
        <ContextPicker
          files={files}
          comments={comments}
          onSelect={selectContext}
          onClose={closePicker}
        />
      )}

      <div className="flex flex-wrap items-center gap-1">
        {showCurrentFile && snapshot.includeCurrentFile && (
          <ContextChip
            item={{ type: "file", path: currentFile }}
            onRemove={() => agentStore.toggleCurrentFile(false)}
            muted
          />
        )}
        {snapshot.context.map((item) => (
          <ContextChip
            key={contextKey(item)}
            item={item}
            prTitle={prTitle}
            onRemove={() => agentStore.removeContext(item)}
          />
        ))}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        rows={3}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? "Wait for the review to finish..."
            : "Ask anything or type @ to add context"
        }
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          title="Add file or comment"
          onClick={() => setShowPicker(true)}
        >
          <AtSign />
        </Button>
        <ModelSelect harness={harness} />

        {isRunning ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto"
            title="Stop"
            onClick={stop}
          >
            <Square className="fill-current" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            className="ml-auto"
            title="Send"
            disabled={disabled || !value.trim()}
            onClick={send}
          >
            <SendHorizontal />
          </Button>
        )}
      </div>
    </div>
  );
}
