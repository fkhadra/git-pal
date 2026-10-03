import { Check, RefreshCw } from "lucide-react";

import { ShortcutTooltip } from "~/components/shortcut-tooltip";
import { Button } from "~/components/ui/button";

import { useIsReviewing } from "./data-loader";
import { useKeybind } from "./shortcuts";
import { useCodeReviewSnapshot } from "./store";
import { useRefreshPullRequest } from "./useRefreshPullRequest";
import { cn } from "cn";

function RefreshIcon({ status }: { status: string }) {
  if (status === "no-changes") {
    return <Check className="size-4 text-success" />;
  }

  return <RefreshCw className={cn("size-4 text-success", status === "checking" && "animate-spin")} />;
}

export function RefreshPullRequestButton() {
  const { handleRefresh } = useRefreshPullRequest();
  const snapshot = useCodeReviewSnapshot();
  const keybind = useKeybind();
  const isReviewing = useIsReviewing(snapshot.selectedReview);

  if (isReviewing) return null;

  return (
    <ShortcutTooltip
      label={
        snapshot.refreshStatus === "no-changes"
          ? "No new changes"
          : "Check for updates"
      }
      shortcut={keybind.refresh}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleRefresh}
        disabled={snapshot.refreshStatus === "checking"}
      >
        <RefreshIcon status={snapshot.refreshStatus} />
      </Button>
    </ShortcutTooltip>
  );
}
