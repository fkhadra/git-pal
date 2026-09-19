import { useSuspenseQuery } from "@tanstack/react-query";

import commands from "~/commands";
import { CommandGroup, CommandItem } from "~/components/ui/command";
import { nil } from "~/libs/utils";
import type { Repository } from "~/models";

import { RepositoryItem } from "./Github";
import { state, useCurrentPage, useStateSnaphot } from "./state";
import { openUrl } from "./utils";

function useOrgPageQuery() {
  const page = useCurrentPage("org");
  const snapshot = useStateSnaphot();
  return useSuspenseQuery({
    queryKey: ["orgPage", page.params.name, snapshot.query],
    queryFn: async () => {
      const { data } = await commands.findRepositories({
        owner: page.params.name,
        query: snapshot.query,
      });

      queueMicrotask(() => {
        data?.search.nodes?.forEach((repo) => {
          if (repo && repo.__typename === "Repository") {
            state.setItem(repo.id, { kind: "repo", data: repo });
          }
        });
      });

      return data;
    },
  });
}

export function OrgPage() {
  const { data } = useOrgPageQuery();

  return (
    <CommandGroup heading="Repositories">
      {data?.search?.nodes?.filter(nil).map((repo) => {
        const v = repo as Repository;

        return (
          <CommandItem
            value={v.id}
            key={v.id}
            keywords={[v.name]}
            onSelect={() => {
              openUrl(v.url);
            }}
          >
            <RepositoryItem repository={v} hideOwner />
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}
