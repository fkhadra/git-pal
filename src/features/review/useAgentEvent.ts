import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import commands from "~/commands";

import { store } from "./store";

export function useAgentEvent() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const unlistenJobs = commands.onJobMessage(() => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["saved-review"] });
    });

    // the selected review may have just been saved, e.g. viewed from the palette
    const unlistenSelection = commands.onReviewSelected(({ payload }) => {
      store.requestReview(payload.reviewSelected);
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
    });

    return () => {
      unlistenJobs.then((fn) => fn());
      unlistenSelection.then((fn) => fn());
    };
  }, [queryClient]);
}
