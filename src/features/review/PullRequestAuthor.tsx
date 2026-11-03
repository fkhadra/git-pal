import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowRight } from "lucide-react";

import type { GetSavedReviewRequest } from "~/models/code-review";
import type { PullRequestAssigneesNodes } from "~/models/get-pull-request";

import { usePullRequestStatusQuery } from "./data-loader";

function Profile({ user }: { user: PullRequestAssigneesNodes }) {
  return (
    <button
      type="button"
      title="Open profile on GitHub"
      className="flex shrink-0 items-center gap-1 hover:text-foreground"
      onClick={() => openUrl(user.url)}
    >
      <img alt="" src={user.avatarUrl} className="size-4 rounded-full" />
      {user.login}
    </button>
  );
}

export function PullRequestAuthor({
  review,
  headRef,
  baseRef,
}: {
  review: GetSavedReviewRequest;
  headRef: string;
  baseRef: string;
}) {
  const { data: pullRequest } = usePullRequestStatusQuery(review);
  const author = pullRequest?.author;
  const assignees = (pullRequest?.assignees.nodes ?? []).filter(
    (user) => user !== null,
  );

  return (
    <div className="mr-auto flex min-w-0 items-center gap-1.5 pl-2 text-xs text-muted-foreground">
      {author && (
        <>
          <span className="shrink-0">by</span>
          <Profile user={author} />
          <span className="shrink-0">·</span>
        </>
      )}
      {assignees.length > 0 && (
        <>
          <span className="shrink-0">assigned to</span>
          {assignees.map((user) => (
            <Profile key={user.login} user={user} />
          ))}
          <span className="shrink-0">·</span>
        </>
      )}
      <span className="truncate font-mono">{headRef}</span>
      <ArrowRight className="size-3 shrink-0" />
      <span className="truncate font-mono">{baseRef}</span>
    </div>
  );
}
