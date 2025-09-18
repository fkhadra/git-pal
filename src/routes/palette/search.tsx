import { createFileRoute, useSearch } from "@tanstack/react-router";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCommandState } from "cmdk";
import { CommandItem } from "~/components/Cmdk";

type SearchParams = {
  owner: string;
  repo?: string;
};

export const Route = createFileRoute("/palette/search")({
  validateSearch(params: Record<string, unknown>): SearchParams {
    return {
      owner: params.owner as SearchParams["owner"],
      repo: params.repo as SearchParams["repo"],
    };
  },
  component() {
    const { owner, repo } = useSearch({ from: "/palette/search" });
    const searchValue = useCommandState((s) => s.search);

    const searchTarget = repo ? `${owner}/${repo}` : owner;

    return (
      <CommandItem
        value="search"
        onSelect={() => {
          if (!searchValue) return;

          let url: string;

          if (repo) {
            url = `https://github.com/search?q=repo:${owner}/${repo} ${searchValue}&type=code`;
          } else {
            url = `https://github.com/search?q=org:${owner} ${searchValue}&type=code`;
          }

          openUrl(url);
        }}
      >
        {searchValue ? (
          <>
            Search <span className="font-bold">"{searchValue}"</span> in
          </>
        ) : (
          <>Start typing to search in</>
        )}{" "}
        <div className="justify-center rounded-md border border-pink-300/40 bg-zinc-900 px-2 text-pink-200">
          {searchTarget}
        </div>
      </CommandItem>
    );
  },
});
