import { cn } from "cn";
import { formatDistanceToNow } from "date-fns";
import { History, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import type { PullRequestKey } from "~/models/agent";

import { useConversationsQuery, useDeleteConversation } from "./data-loader";
import { agentStore, useAgentSnapshot } from "./store";

export function HistoryPopover({ pr }: { pr: PullRequestKey | null }) {
  const [open, setOpen] = useState(false);
  const snapshot = useAgentSnapshot();
  const { data: conversations = [] } = useConversationsQuery(pr);
  const { mutateAsync: deleteConversation } = useDeleteConversation();

  async function handleDelete(id: number) {
    try {
      await deleteConversation(id);
      if (snapshot.conversationId === id) agentStore.newChat();
    } catch (error) {
      toast.error(String(error));
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            title="History"
            disabled={!pr || !!snapshot.run}
          >
            <History />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-1">
        {conversations.length === 0 && (
          <p className="p-3 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50",
              snapshot.conversationId === c.id && "bg-muted/50",
            )}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                agentStore.openConversation(c.id);
                setOpen(false);
              }}
            >
              <div className="truncate text-sm">{c.title}</div>
              <div className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(c.updatedAt), {
                  addSuffix: true,
                })}
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              title="Delete"
              className="opacity-0 group-hover:opacity-100"
              onClick={() => handleDelete(c.id)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
