import { useCommandState } from "cmdk";
import { Suspense, useEffect, useRef } from "react";

import commands from "~/commands";
import { Command, CommandEmpty, CommandList } from "~/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useFullHeightRef } from "~/libs/useFullHeight";

import { CommandInput } from "./CommandInput";
import { Help } from "./Help";
import { HomePage } from "./HomePage";
import { OrgPage } from "./OrgPage";
import { PaletteFooter } from "./PaletteFooter";
import {
  PullRequestsPage,
  usePreloadPullRequestsQueries,
} from "./PullRequestsPage";
import { RepositoryPage } from "./RepositoryPage";
import { ReviewTemplatePage } from "./ReviewTemplatePage";
import { SearchPage } from "./SearchPage";
import { usePaletteKeybindSync } from "./shortcuts";
import { SkeletonRows } from "./SkeletonRows";
import { useRepositoryFilterSync } from "./useRepositoryFilterSync";
import {
  createPageMapper,
  state,
  useCurrentPage,
  useDisableEmptySearchResults,
  useGHSearchActive,
  useSyncStateSnapshot,
} from "./state";

const pages = createPageMapper({
  home: HomePage,
  org: OrgPage,
  "pull-requests": PullRequestsPage,
  repository: RepositoryPage,
  "review-template": ReviewTemplatePage,
  search: SearchPage,
});

export function PalettePage() {
  const listBox = useFullHeightRef<HTMLDivElement>({ bottomPadding: 52 });
  const isGhSearchActive = useGHSearchActive();
  const snapshot = useSyncStateSnapshot();
  const currentPage = useCurrentPage();
  const Page = pages[currentPage.to];
  const timeoutId = useRef<ReturnType<typeof setTimeout>>(undefined);

  usePreloadPullRequestsQueries();
  usePaletteKeybindSync();
  useRepositoryFilterSync();

  useEffect(() => {
    clearTimeout(timeoutId.current);
    timeoutId.current = setTimeout(() => {
      commands.monitorPullRequests();
    }, 20_000);

    return () => {
      commands.stopMonitoring();
    };
  }, []);

  return (
    <div className="h-screen rounded-(--body-radius) border border-foreground/15 deep-purple:bg-linear-to-tl deep-purple:from-brand-alt/10 deep-purple:to-brand/10">
      <Command
        loop
        className="relative h-full overflow-hidden rounded-none! bg-transparent p-0 text-inherit"
        shouldFilter={!isGhSearchActive}
        value={snapshot.selectedValue}
        onValueChange={state.setSelectedValue}
      >
        <CommandInput />
        <CommandList ref={listBox.setRef} data-palette-list className="px-2">
          <Suspense fallback={<SkeletonRows />}>
            <EmptySearchResults />
            <Page />
          </Suspense>
        </CommandList>
        <PaletteFooter />
      </Command>
      <Dialog open={snapshot.displayHelp} onOpenChange={state.toggleHelp}>
        <DialogContent className="max-h-[85vh] w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Help</DialogTitle>
          </DialogHeader>
          <Help />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptySearchResults() {
  const search = useCommandState((s) => s.search);
  const isGhSearchActive = useGHSearchActive();
  const disableEmptySearchResults = useDisableEmptySearchResults();

  if (isGhSearchActive || search.length === 0 || disableEmptySearchResults)
    return null;

  return (
    <CommandEmpty>
      <span
        role="img"
        aria-label="dunno what you are looking for"
        className="mr-1"
      >
        🤷‍♂️
      </span>
      No results found.
    </CommandEmpty>
  );
}
