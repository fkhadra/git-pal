import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";

import commands from "~/commands";

import { store, useCodeReviewSnapshot } from "./store";

const NO_CHANGES_DISPLAY_MS = 2000;

/** Refetches the pull request, new commits surface in the update banner. */
export function useRefreshPullRequest() {
  const snapshot = useCodeReviewSnapshot();
  const queryClient = useQueryClient();

  return {
    handleRefresh: async () => {
      const selectedReview = snapshot.selectedReview;
      if (!selectedReview) return;

      store.toggleRefreshStatus("checking");
      queryClient.invalidateQueries({ queryKey: ["pr-status"] });
      queryClient.invalidateQueries({ queryKey: ["pr-conversation"] });
      queryClient.invalidateQueries({ queryKey: ["pr-head"] });

      const request = {
        owner: selectedReview.owner,
        repository: selectedReview.repository,
        number: selectedReview.prNumber,
      };

      try {
        const fresh = await queryClient.fetchQuery({
          queryKey: ["pr-details", request],
          queryFn: () => commands.getPullRequest(request),
          staleTime: 0,
        });

        if (fresh.headSha !== selectedReview.headSha) {
          queryClient.invalidateQueries({ queryKey: ["pr-diff", request] });
          store.toggleRefreshStatus("idle");
          return;
        }

        store.toggleRefreshStatus("no-changes");
        setTimeout(
          () => store.toggleRefreshStatus("idle"),
          NO_CHANGES_DISPLAY_MS,
        );
      } catch (error) {
        store.toggleRefreshStatus("idle");
        toast.error(String(error));
      }
    },
  };
}
