import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import commands from "~/commands";
import type { ContextItem, PullRequestKey } from "~/models/agent";
import type { Harness } from "~/models/harness";

import { agentStore, useAgentSnapshot } from "./store";

const messagesKey = (conversationId: number | null) => [
  "agent-messages",
  conversationId,
];

export function useConversationsQuery(pr: PullRequestKey | null) {
  return useQuery({
    queryKey: ["agent-conversations", pr],
    queryFn: () => commands.agentListConversations(pr!),
    enabled: !!pr,
  });
}

/** Models of `harness`, the default harness when omitted. */
export function useModelsQuery(harness?: Harness) {
  return useQuery({
    queryKey: ["models", harness],
    queryFn: () => commands.listModels(harness),
    // an empty list is a failed listing, asked again next time
    staleTime: (query) => (query.state.data?.length ? Infinity : 0),
  });
}

export function useHarnessSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const listener = commands.onSettingChanged((event) => {
      const value = event.payload.settingChanged;
      if ("models" in value) {
        queryClient.invalidateQueries({ queryKey: ["harness-model"] });
      }

      if (!("harness" in value)) return;

      agentStore.setDefaultHarness(value.harness);
      queryClient.invalidateQueries({ queryKey: ["harness-model"] });
      queryClient.invalidateQueries({ queryKey: ["models"] });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, [queryClient]);
}

/** Model `harness` runs with when none is picked, the default harness when omitted. */
export function useHarnessModelQuery(harness?: Harness) {
  return useQuery({
    queryKey: ["harness-model", harness],
    queryFn: () => commands.harnessModel(harness),
  });
}

export function useDefaultModelQuery(harness: Harness) {
  return useQuery({
    queryKey: ["default-model", harness],
    queryFn: () => commands.defaultModel(harness),
  });
}

export function useMessagesQuery(conversationId: number | null) {
  return useQuery({
    queryKey: messagesKey(conversationId),
    queryFn: () => commands.agentMessages(conversationId!),
    enabled: conversationId != null,
    // refreshed explicitly once a run completes
    staleTime: Infinity,
  });
}

export function useSendMessage(
  pr: PullRequestKey | null,
  currentFile?: string,
) {
  const queryClient = useQueryClient();
  const snapshot = useAgentSnapshot();

  return async (prompt: string) => {
    if (!pr || snapshot.run || !prompt.trim()) return;

    const context: ContextItem[] = [...snapshot.context];
    const hasCurrentFile = context.some(
      (c) => c.type === "file" && c.path === currentFile,
    );
    if (snapshot.includeCurrentFile && currentFile && !hasCurrentFile) {
      context.push({ type: "file", path: currentFile });
    }

    agentStore.startRun(prompt);

    try {
      const conversationId = await commands.agentSend(
        {
          ...pr,
          conversationId: snapshot.conversationId,
          prompt,
          context,
          model: snapshot.model,
        },
        agentStore.applyEvent,
      );

      // load the persisted messages before dropping the streamed ones
      await queryClient.query({
        queryKey: messagesKey(conversationId),
        queryFn: () => commands.agentMessages(conversationId),
        staleTime: 0,
      });
      queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
      agentStore.finishRun(conversationId);
    } catch (error) {
      agentStore.fail(String(error));
    }
  };
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commands.agentDeleteConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-conversations"] });
    },
  });
}
