import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import commands from "~/commands";

// lists the repository filter narrows, own pull requests ride along in "homepage"
const FILTERED_QUERIES = [["pull-requests"], ["homepage"], ["orgPage"]];
const LIST_SETTINGS = ["repositoryFilter", "pullRequestLimit"];

/** Refetches the palette's lists once the repository filter or the limit changes. */
export function useRepositoryFilterSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const listener = commands.onSettingChanged((event) => {
      const changed = event.payload.settingChanged;
      if (!LIST_SETTINGS.some((key) => key in changed)) return;

      for (const queryKey of FILTERED_QUERIES) {
        queryClient.invalidateQueries({ queryKey });
      }
    });

    return () => {
      listener.then((unsub) => unsub());
    };
  }, [queryClient]);
}
