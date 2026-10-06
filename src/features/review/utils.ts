import type { CommentContext, ReviewEvent } from "~/models";
import type {
  GetSavedReviewRequest,
  ReviewComment,
} from "~/models/code-review";
import type { InlineComment } from "~/models/conversation";

// URL schemes and hosts are case-insensitive
const PR_URL_REGEX = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i;
const SHORTHAND_REGEX = /^([^/]+)\/([^#]+)#(\d+)$/;

export function parsePrUrl(input: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(PR_URL_REGEX);
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      number: parseInt(urlMatch[3], 10),
    };
  }

  const shortMatch = trimmed.match(SHORTHAND_REGEX);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      number: parseInt(shortMatch[3], 10),
    };
  }

  return null;
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  rs: "rust",
  py: "python",
  go: "go",
  java: "java",
  kt: "kotlin",
  rb: "ruby",
  css: "css",
  scss: "scss",
  html: "markup",
  xml: "markup",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  sql: "sql",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  dockerfile: "docker",
  graphql: "graphql",
  gql: "graphql",
};

/** Room for reading long comments and summaries in the review sheets. */
export const WIDE_SHEET_CLASS = "data-[side=right]:sm:max-w-2xl";

// C-style escapes git uses in quoted paths, besides octal bytes
const GIT_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  '"': '"',
  "\\": "\\",
};
const OCTAL_BYTE = /^[0-7]{3}$/;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/** Decodes git's escapes, non-ASCII characters come as octal UTF-8 bytes like `\342\232\241`. */
function decodeGitEscapes(text: string) {
  const bytes: number[] = [];

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\\") {
      bytes.push(...textEncoder.encode(text[i]));
      continue;
    }

    const octal = text.slice(i + 1, i + 4);
    if (OCTAL_BYTE.test(octal)) {
      bytes.push(parseInt(octal, 8));
      i += 3;
      continue;
    }

    const next = text[i + 1] ?? "";
    bytes.push(...textEncoder.encode(GIT_ESCAPES[next] ?? next));
    i += 1;
  }

  return textDecoder.decode(new Uint8Array(bytes));
}

/**
 * Repository path of a parsed diff file. Git prefixes paths with `a/`/`b/` and
 * quotes non-ASCII ones, which the parser leaves half stripped: `/dir/\342\232\241.yml"`.
 */
export function normalizeDiffPath(path: string) {
  const unquoted = path.replace(/^"?(?:[ab]\/|\/)?/, "").replace(/"$/, "");
  if (!unquoted.includes("\\")) return unquoted;

  return decodeGitEscapes(unquoted);
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  const basename = filename.split("/").pop()?.toLowerCase() ?? "";

  if (basename === "dockerfile") return "docker";
  if (basename.endsWith(".graphql") || basename.endsWith(".gql"))
    return "graphql";

  return EXTENSION_LANGUAGE_MAP[ext] ?? "text";
}

export function getFileStatusIcon(status: string): string {
  switch (status) {
    case "added":
      return "A";
    case "removed":
      return "D";
    case "modified":
      return "M";
    case "renamed":
      return "R";
    case "copied":
      return "C";
    default:
      return "?";
  }
}

export function getFileStatusColor(status: string): string {
  switch (status) {
    case "added":
      return "text-success";
    case "removed":
      return "text-destructive";
    case "modified":
      return "text-warning";
    case "renamed":
      return "text-info";
    default:
      return "text-muted-foreground";
  }
}

export function getDiffType(
  status: string,
): "add" | "delete" | "modify" | "rename" | "copy" {
  switch (status) {
    case "added":
      return "add";
    case "removed":
      return "delete";
    case "renamed":
      return "rename";
    case "copied":
      return "copy";
    default:
      return "modify";
  }
}

/** Mirrors the job id built by the `review_pull_request` command. */
export function reviewJobId(review: GetSavedReviewRequest) {
  return `review-${review.owner}-${review.repository}-${review.prNumber}`;
}

export function isSameReview(
  a: GetSavedReviewRequest,
  b: GetSavedReviewRequest,
) {
  return (
    a.owner === b.owner &&
    a.repository === b.repository &&
    a.prNumber === b.prNumber
  );
}

/** Waiting to be posted with the next GitHub review. */
export type ReviewStatus =
  | "todo"
  | "inProgress"
  | "approved"
  | "changesRequested"
  | "commented";

const SUBMITTED_STATUS: Record<ReviewEvent, ReviewStatus> = {
  APPROVE: "approved",
  REQUEST_CHANGES: "changesRequested",
  COMMENT: "commented",
};

export interface ReviewProgress {
  submittedHeadSha: string | null;
  submittedEvent: ReviewEvent | null;
  reviewed: boolean;
  isReviewing: boolean;
  noteCount: number;
  /** Notes not posted yet */
  pendingCount: number;
}

export function reviewStatus(
  review: ReviewProgress,
  latestHeadSha?: string,
): ReviewStatus {
  if (review.isReviewing) return "inProgress";

  const { submittedHeadSha, submittedEvent } = review;
  const isOutdated = !!latestHeadSha && latestHeadSha !== submittedHeadSha;
  if (
    submittedHeadSha &&
    submittedEvent &&
    !isOutdated &&
    review.pendingCount === 0
  ) {
    return SUBMITTED_STATUS[submittedEvent];
  }
  if (review.reviewed || review.noteCount > 0) return "inProgress";

  return "todo";
}

export function isPendingComment(comment: ReviewComment) {
  return !comment.posted && (comment.severity === "user" || comment.publish);
}

export interface InlineThread {
  root: InlineComment;
  replies: InlineComment[];
}

export function buildThreads(comments: readonly InlineComment[]) {
  return comments
    .filter((c) => c.inReplyToId == null)
    .map((root) => ({
      root,
      replies: comments.filter((c) => c.inReplyToId === root.id),
    }));
}

/** Whether a thread can sit on a line of the new version of the file. */
export function isAnchored({ root }: InlineThread) {
  return root.onNewSide && !root.isFileComment && root.line != null;
}

export function reviewCommentContext(comment: ReviewComment): CommentContext {
  const isNote = comment.severity === "user";

  return {
    type: "comment",
    path: comment.file,
    line: comment.line,
    author: isNote ? "the user" : `the AI review (${comment.severity})`,
    body: comment.comment,
  };
}

export function threadContext({ root, replies }: InlineThread): CommentContext {
  const answers = replies.map((r) => `@${r.author}: ${r.body}`);

  return {
    type: "comment",
    path: root.path,
    line: root.line,
    author: `@${root.author} on GitHub`,
    body: [root.body, ...answers].join("\n\n"),
  };
}
