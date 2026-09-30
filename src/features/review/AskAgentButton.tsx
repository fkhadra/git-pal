import { AgentAvatar } from "~/components/agent-avatar";

import { ActionButton } from "./ActionButton";

export function AskAgentButton({ onClick }: { onClick: () => void }) {
  return (
    <ActionButton tooltip="Ask AI" onClick={onClick}>
      <AgentAvatar size={14} paused />
    </ActionButton>
  );
}
