import { useQuery } from "@tanstack/react-query";

import commands from "~/commands";

export type { Job } from "~/models/jobs";

const QUERY_KEY = ["jobs"] as const;

export function useJobs() {
  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: commands.listJobs,
    staleTime: 0,
  });

  return { tasks: data ?? [] };
}
