import { openUrl } from "@tauri-apps/plugin-opener";
import { ArrowRight } from "lucide-react";

import type { GetSavedReviewRequest } from "~/models/code-review";

import { usePullRequestStatusQuery } from "./data-loader";

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

  return (
    <div className="mr-auto flex min-w-0 items-center gap-1.5 pl-2 text-xs text-muted-foreground">
      {author && (
        <>
          <span className="shrink-0">by</span>
          <button
            type="button"
            title="Open profile on GitHub"
            className="flex shrink-0 items-center gap-1 hover:text-foreground"
            onClick={() => openUrl(author.url)}
          >
            <img
              alt=""
              src={author.avatarUrl}
              className="size-4 rounded-full"
            />
            {author.login}
          </button>
          <span className="shrink-0">·</span>
        </>
      )}
      <span className="truncate font-mono">{headRef}</span>
      <ArrowRight className="size-3 shrink-0" />
      <span className="truncate font-mono">{baseRef}</span>
    </div>
  );
}
