import { proxy, useSnapshot } from "valtio";

import type { AgentEvent, ContextItem } from "~/models/agent";
import type { Block } from "~/models/harness";

interface State {
  conversationId: number | null;
  /** `null` lets the harness pick its default model */
  model: string | null;
  /** Context attached by the user, the current file is handled separately */
  context: ContextItem[];
  includeCurrentFile: boolean;
  /** Set while the agent runs */
  run: {
    conversationId: number | null;
    prompt: string;
    blocks: Block[];
  } | null;
  error: string | null;
}

const DEFAULT_CONTEXT: ContextItem[] = [{ type: "pullRequest" }];

const state = proxy<State>({
  conversationId: null,
  model: null,
  context: [...DEFAULT_CONTEXT],
  includeCurrentFile: true,
  run: null,
  error: null,
});

function isSameContext(a: ContextItem, b: ContextItem) {
  if (a.type === "file" && b.type === "file") return a.path === b.path;
  if (a.type === "comment" && b.type === "comment") {
    return a.path === b.path && a.line === b.line && a.body === b.body;
  }

  return a.type === b.type;
}

export const agentStore = {
  newChat() {
    // a pending run keeps going in the background and is persisted there
    state.run = null;
    state.conversationId = null;
    state.context = [...DEFAULT_CONTEXT];
    state.includeCurrentFile = true;
    state.error = null;
  },
  openConversation(id: number) {
    state.conversationId = id;
    state.error = null;
  },
  setModel(model: string | null) {
    state.model = model;
  },
  addContext(item: ContextItem) {
    if (state.context.some((c) => isSameContext(c, item))) return;

    state.context.push(item);
  },
  removeContext(item: ContextItem) {
    state.context = state.context.filter((c) => !isSameContext(c, item));
  },
  toggleCurrentFile(include: boolean) {
    state.includeCurrentFile = include;
  },
  startRun(prompt: string) {
    state.error = null;
    state.run = { conversationId: state.conversationId, prompt, blocks: [] };
  },
  applyEvent(event: AgentEvent) {
    const run = state.run;
    if (!run) return;

    switch (event.type) {
      case "started":
        run.conversationId = event.conversationId;
        break;
      case "textDelta": {
        const last = run.blocks[run.blocks.length - 1];
        if (last?.type === "text") last.text += event.text;
        else run.blocks.push({ type: "text", text: event.text });
        break;
      }
      case "block":
        run.blocks.push(event.block);
        break;
      case "error":
        state.error = event.message;
        break;
    }
  },
  /** Swaps the streamed run for the persisted conversation */
  finishRun(conversationId: number) {
    if (!state.run) return;

    state.conversationId = conversationId;
    state.run = null;
  },
  fail(message: string) {
    if (!state.run) return;

    state.error = message;
    state.run = null;
  },
  runningConversationId() {
    return state.run?.conversationId ?? null;
  },
};

export function useAgentSnapshot() {
  return useSnapshot(state);
}
