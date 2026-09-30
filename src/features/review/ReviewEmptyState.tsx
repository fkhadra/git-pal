import { AgentAvatar } from "~/components/agent-avatar";
import { ShortcutKeys } from "~/components/shortcut-keys";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

import { PrUrlInput } from "./PrUrlInput";

export function ReviewEmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia className="relative">
          <div className="absolute inset-0 -m-6 rounded-full bg-radial from-agent/25 to-transparent to-70% blur-xl" />
          <AgentAvatar size={72} className="relative" />
        </EmptyMedia>
        <EmptyTitle className="text-base">Ready when you are</EmptyTitle>
        <EmptyDescription>
          Paste a pull request URL to start a review, or pick one from the
          palette{" "}
          <ShortcutKeys
            shortcut={globalThis.settings.keybind.showPalette}
            className="inline-flex align-middle"
          />
          .
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-md">
        <PrUrlInput />
      </EmptyContent>
    </Empty>
  );
}
