import { Command as CommandPrimitive } from "cmdk";
import {
  GitBranch,
  GitPullRequestArrow,
  MessageCircleMore,
  Search,
} from "lucide-react";
import { useState } from "react";

import { AgentAvatar } from "~/components/agent-avatar";
import { IconWrapper } from "~/components/icon-wrapper";
import { Keybind } from "~/components/keybind";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Page, PullRequestStatusIcon } from "~/features/palette/Github";
import { ReviewDecision } from "~/features/palette/Github/ReviewDecision";
import { Container } from "~/features/palette/Layout";
import type { PullRequestReviewDecision } from "~/models";

export interface DemoPullRequest {
  title: string;
  repository: string;
  number: number;
  baseRef: string;
  decision: PullRequestReviewDecision;
}

export const QUERY = "auth";

export const PULL_REQUESTS: DemoPullRequest[] = [
  {
    title: "Add retry to job runner",
    repository: "acme/api",
    number: 409,
    baseRef: "main",
    decision: "APPROVED",
  },
  {
    title: "Fix auth redirect loop",
    repository: "acme/web",
    number: 412,
    baseRef: "main",
    decision: "REVIEW_REQUIRED",
  },
  {
    title: "Bump tokio to 1.49",
    repository: "acme/api",
    number: 405,
    baseRef: "main",
    decision: "CHANGES_REQUESTED",
  },
];

// substring match, cmdk's fuzzy score would keep unrelated rows
function filter(_value: string, search: string, keywords?: string[]) {
  return keywords?.join(" ").toLowerCase().includes(search) ? 1 : 0;
}

function PullRequestRow({ pullRequest }: { pullRequest: DemoPullRequest }) {
  return (
    <Container>
      <IconWrapper>
        <PullRequestStatusIcon.Ready />
      </IconWrapper>
      <div className="flex flex-col">
        <span>{pullRequest.title}</span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground group-data-[selected=true]:text-primary-foreground/80">
          <span>{pullRequest.repository}</span>
          <GitBranch className="size-3" />
          <span>{pullRequest.baseRef}</span>
        </div>
      </div>
      <ReviewDecision value={pullRequest.decision} />
    </Container>
  );
}

interface Props {
  typed: number;
  /** Enter was just pressed */
  isOpening: boolean;
}

/** Mock of the palette home, filtered as the query is typed. */
export function PaletteDemo({ typed, isOpening }: Props) {
  const [selected, setSelected] = useState("");
  const search = QUERY.slice(0, typed);
  const isPullRequest = selected.startsWith("pr-");

  return (
    <Command
      filter={filter}
      value={selected}
      onValueChange={setSelected}
      className="h-full rounded-none! bg-transparent p-0 text-inherit"
    >
      <CommandPrimitive.Input value={search} readOnly className="sr-only" />
      <div className="mb-2 flex items-center gap-1 border-b px-3 py-2">
        <Search className="text-primary" />
        <span className="flex flex-1 items-center p-2">
          {search || (
            <span className="text-muted-foreground">
              Search, @ to filter by author
            </span>
          )}
          <span className="h-5 w-px animate-caret-blink bg-primary" />
        </span>
      </div>

      <CommandList className="flex-1 px-2">
        <CommandGroup heading="Reviews">
          <CommandItem value="open-review-pal" keywords={["Open Review Pal"]}>
            <Page icon={<AgentAvatar size={20} />}>Open Review Pal</Page>
          </CommandItem>
          <CommandItem value="review-requested" keywords={["Review Requested"]}>
            <Page icon={<GitPullRequestArrow className="text-info" />}>
              Review Requested
            </Page>
          </CommandItem>
          <CommandItem value="mentioned" keywords={["Mentioned"]}>
            <Page icon={<MessageCircleMore className="text-brand-alt" />}>
              Mentioned
            </Page>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Open Pull Requests">
          {PULL_REQUESTS.map((pullRequest) => (
            <CommandItem
              key={pullRequest.number}
              value={`pr-${pullRequest.number}`}
              keywords={[pullRequest.title]}
              className={isOpening ? "scale-[0.98] transition" : undefined}
            >
              <PullRequestRow pullRequest={pullRequest} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <footer className="mt-1 flex h-12 items-center justify-end gap-2 border-t p-2 text-xs">
        <Keybind label="Help" keys={["⌘", "/"]} className="mr-auto" />
        <Keybind label={isPullRequest ? "Review" : "Open"} keys={["↵"]} />
      </footer>
    </Command>
  );
}
