import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Diff,
  Hunk,
  parseDiff,
  tokenize,
  markEdits,
  getChangeKey,
} from "react-diff-view";
import type {
  ChangeData,
  ChangeEventArgs,
  FileData,
  HunkData,
  ViewType,
} from "react-diff-view";
import { refractor as _refractor } from "refractor";
import docker from "refractor/docker";
import graphql from "refractor/graphql";
import jsx from "refractor/jsx";
import toml from "refractor/toml";
import tsx from "refractor/tsx";
import { toast } from "react-toastify";

import type { CommentContext, PullRequestFile } from "~/models";
import type { ReviewComment } from "~/models/code-review";

import { CommentForm } from "./CommentForm";
import { fileSourceQuery } from "./data-loader";
import {
  type ExpandDirection,
  expandGap,
  findGap,
  toLines,
} from "./diff-expansion";
import { DiffExpander } from "./DiffExpander";
import { GithubThreadWidget } from "./GithubThreadWidget";
import { ReviewCommentWidget } from "./ReviewCommentWidget";
import {
  getDiffType,
  getLanguageFromFilename,
  type InlineThread,
  isAnchored,
  normalizeDiffPath,
  reviewCommentContext,
  threadContext,
} from "./utils";

// the common bundle lacks some languages getLanguageFromFilename maps to
for (const language of [docker, graphql, jsx, toml, tsx]) {
  _refractor.register(language);
}

// refractor v5 returns {type: 'root', children: [...]} from highlight(),
// but react-diff-view's tokenizer expects highlight() to return the children array directly.
// Wrap it so the tokenizer gets what it expects.
const refractor = {
  ..._refractor,
  highlight(code: string, language: string) {
    const root = _refractor.highlight(code, language);
    return root.children;
  },
  registered: _refractor.registered.bind(_refractor),
};

/** Extract the new-side line number from any change type. */
function getNewLineNumber(change: ChangeData): number | undefined {
  if ("newLineNumber" in change)
    return (change as { newLineNumber: number }).newLineNumber;
  if ("isInsert" in change && "lineNumber" in change)
    return (change as { lineNumber: number }).lineNumber;
  return undefined;
}

export interface NewComment {
  file: string;
  line: number | null;
  startLine: number | null;
  comment: string;
}

/** New-side lines picked in the gutter, GitHub requires ranges within one hunk. */
interface Selection {
  hunkIndex: number;
  anchor: number;
  focus: number;
}

interface DiffViewerProps {
  owner: string;
  repository: string;
  /** Commit the unchanged lines are loaded from when expanding */
  headSha: string;
  file: PullRequestFile;
  rawDiff: string;
  viewType: ViewType;
  comments: ReviewComment[];
  /** Existing GitHub threads on this file, read-only */
  threads: InlineThread[];
  isAddingFileComment?: boolean;
  onCloseFileComment?: () => void;
  onAddComment?: (comment: NewComment) => void;
  onDeleteComment?: (comment: ReviewComment) => void;
  onUpdateComment?: (
    comment: ReviewComment,
    patch: Partial<ReviewComment>,
  ) => void;
  onAskAgent?: (item: CommentContext) => void;
}

function findFileInDiff(
  files: FileData[],
  filename: string,
): FileData | undefined {
  return files.find((f) => {
    const newPath = normalizeDiffPath(f.newPath ?? "");
    const oldPath = normalizeDiffPath(f.oldPath ?? "");
    return newPath === filename || oldPath === filename;
  });
}

export function DiffViewer({
  owner,
  repository,
  headSha,
  file,
  rawDiff,
  viewType,
  comments,
  threads,
  isAddingFileComment,
  onCloseFileComment,
  onAddComment,
  onDeleteComment,
  onUpdateComment,
  onAskAgent,
}: DiffViewerProps) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // a drag can end anywhere, not only over the gutter
  useEffect(() => {
    if (!isDragging) return;

    const stopDragging = () => setIsDragging(false);
    document.addEventListener("mouseup", stopDragging);
    return () => document.removeEventListener("mouseup", stopDragging);
  }, [isDragging]);

  const { hunks, diffType } = useMemo(() => {
    try {
      const files = parseDiff(rawDiff);
      const match = findFileInDiff(files, file.filename);

      if (!match) {
        return { hunks: [] as HunkData[], diffType: getDiffType(file.status) };
      }

      // Ensure each hunk has a valid changes array
      const safeHunks = (match.hunks ?? []).filter(
        (h) => Array.isArray(h.changes) && h.changes.length > 0,
      );

      return {
        hunks: safeHunks,
        diffType:
          (match.type as ReturnType<typeof getDiffType>) ??
          getDiffType(file.status),
      };
    } catch (e) {
      console.warn("parseDiff failed for", file.filename, e);
      return { hunks: [] as HunkData[], diffType: getDiffType(file.status) };
    }
  }, [rawDiff, file.filename, file.status]);

  const queryClient = useQueryClient();
  const sourceOptions = fileSourceQuery({
    owner,
    repository,
    path: file.filename,
    gitRef: headSha,
  });
  // cached once expanded, tells how many lines follow the last hunk
  const { data: source } = useQuery(sourceOptions);
  const [expansion, setExpansion] = useState<{
    base: HunkData[];
    hunks: HunkData[];
  } | null>(null);
  const [expandingIndex, setExpandingIndex] = useState<number | null>(null);

  // expanded lines are display only, GitHub rejects comments outside the diff
  const shownHunks = expansion?.base === hunks ? expansion.hunks : hunks;
  const lineCount = useMemo(
    () => (source == null ? undefined : toLines(source).length),
    [source],
  );

  const expand = async (index: number, direction: ExpandDirection) => {
    setExpandingIndex(index);
    try {
      const lines = toLines(await queryClient.fetchQuery(sourceOptions));
      const gap = findGap(shownHunks, index, lines.length);
      if (!gap) return;

      setExpansion({
        base: hunks,
        hunks: expandGap(shownHunks, lines, gap, direction),
      });
    } catch (error) {
      toast.error(String(error));
    } finally {
      setExpandingIndex(null);
    }
  };

  const renderExpander = (index: number, count: number) => {
    const gap = findGap(shownHunks, index, lineCount);
    if (!gap) return [];

    return [
      <DiffExpander
        key={`expander-${index}`}
        gap={gap}
        isFirst={index === 0}
        isLast={index === count}
        isLoading={expandingIndex === index}
        onExpand={(direction) => expand(index, direction)}
      />,
    ];
  };

  const language = getLanguageFromFilename(file.filename);

  const tokens = useMemo(() => {
    if (shownHunks.length === 0) return null;

    try {
      const enhancers = [markEdits(shownHunks, { type: "block" })];

      if (language !== "text" && refractor.registered(language)) {
        return tokenize(shownHunks, {
          highlight: true,
          refractor,
          language,
          enhancers,
        });
      }

      return tokenize(shownHunks, { enhancers });
    } catch (e) {
      console.warn("Tokenization failed for", file.filename, e);
      return null;
    }
  }, [shownHunks, language, file.filename]);

  // new-side line number -> change rendering it
  const lines = useMemo(() => {
    const map = new Map<number, { change: ChangeData; hunkIndex: number }>();

    hunks.forEach((hunk, hunkIndex) => {
      for (const change of hunk.changes as ChangeData[]) {
        const line = getNewLineNumber(change);
        if (line != null) map.set(line, { change, hunkIndex });
      }
    });

    return map;
  }, [hunks]);

  const range = useMemo(
    () =>
      selection && {
        start: Math.min(selection.anchor, selection.focus),
        end: Math.max(selection.anchor, selection.focus),
      },
    [selection],
  );

  const selectedChanges = useMemo(() => {
    if (!range) return [];

    const keys: string[] = [];
    for (let line = range.start; line <= range.end; line++) {
      const entry = lines.get(line);
      if (entry) keys.push(getChangeKey(entry.change));
    }

    return keys;
  }, [lines, range]);

  const renderComment = (comment: ReviewComment, key: string) => {
    const isUserComment = comment.severity === "user";

    return (
      <ReviewCommentWidget
        key={key}
        comment={comment}
        onDelete={
          isUserComment && onDeleteComment
            ? () => onDeleteComment(comment)
            : undefined
        }
        onTogglePublish={
          !isUserComment && !comment.posted && onUpdateComment
            ? () => onUpdateComment(comment, { publish: !comment.publish })
            : undefined
        }
        onAskAgent={
          onAskAgent && (() => onAskAgent(reviewCommentContext(comment)))
        }
        onEdit={
          !comment.posted && onUpdateComment
            ? (text) => onUpdateComment(comment, { comment: text })
            : undefined
        }
      />
    );
  };

  const renderThread = (thread: InlineThread) => (
    <GithubThreadWidget
      key={thread.root.id}
      thread={thread}
      onAskAgent={onAskAgent && (() => onAskAgent(threadContext(thread)))}
    />
  );

  const widgets: Record<string, React.ReactNode> = {};
  const unanchoredThreads: InlineThread[] = [];

  for (const thread of threads) {
    const entry = isAnchored(thread) ? lines.get(thread.root.line!) : undefined;
    if (!entry) {
      unanchoredThreads.push(thread);
      continue;
    }

    const key = getChangeKey(entry.change);
    widgets[key] = (
      <>
        {widgets[key]}
        {renderThread(thread)}
      </>
    );
  }

  comments.forEach((comment, index) => {
    const entry = comment.line != null ? lines.get(comment.line) : undefined;
    if (!entry) return;

    const key = getChangeKey(entry.change);
    widgets[key] = (
      <>
        {widgets[key]}
        {renderComment(comment, `${key}-${index}`)}
      </>
    );
  });

  const formEntry = range && lines.get(range.end);
  if (range && formEntry && !isDragging) {
    const key = getChangeKey(formEntry.change);
    widgets[key] = (
      <>
        {widgets[key]}
        <CommentForm
          label={
            range.start < range.end
              ? `Comment on lines ${range.start}-${range.end}`
              : `Comment on line ${range.end}`
          }
          onSubmit={(text) => {
            onAddComment?.({
              file: file.filename,
              line: range.end,
              startLine: range.start < range.end ? range.start : null,
              comment: text,
            });
            setSelection(null);
          }}
          onCancel={() => setSelection(null)}
        />
      </>
    );
  }

  const lineEntry = (change: ChangeData | null) => {
    const line = change && getNewLineNumber(change);
    const entry = line != null ? lines.get(line) : undefined;

    return line != null && entry ? { line, entry } : null;
  };

  const gutterEvents = {
    onMouseDown: ({ change }: ChangeEventArgs, event: React.MouseEvent) => {
      const target = lineEntry(change);
      if (!target || !onAddComment) return;

      // keeps the browser from selecting text while dragging
      event.preventDefault();
      const { line, entry } = target;

      const isExtending =
        event.shiftKey && selection?.hunkIndex === entry.hunkIndex;
      if (isExtending) {
        setSelection({ ...selection, focus: line });
        return;
      }

      const isSameLine = selection?.anchor === line && selection.focus === line;
      if (isSameLine) {
        setSelection(null);
        return;
      }

      setSelection({ hunkIndex: entry.hunkIndex, anchor: line, focus: line });
      setIsDragging(true);
    },
    // GitHub only accepts ranges within one hunk
    onMouseEnter: ({ change }: ChangeEventArgs) => {
      const target = lineEntry(change);
      if (!isDragging || !selection || !target) return;
      if (target.entry.hunkIndex !== selection.hunkIndex) return;

      setSelection({ ...selection, focus: target.line });
    },
  };

  if (!file.patch && hunks.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        Binary file or no changes to display
      </div>
    );
  }

  const fileComments = comments.filter((c) => c.line == null);

  return (
    <div className="diff-viewer">
      {(fileComments.length > 0 ||
        unanchoredThreads.length > 0 ||
        isAddingFileComment) && (
        <div className="border-b p-2">
          {unanchoredThreads.map(renderThread)}
          {fileComments.map((c, i) => renderComment(c, `file-${i}`))}
          {isAddingFileComment && (
            <CommentForm
              label="Comment on file"
              onSubmit={(text) => {
                onAddComment?.({
                  file: file.filename,
                  line: null,
                  startLine: null,
                  comment: text,
                });
                onCloseFileComment?.();
              }}
              onCancel={() => onCloseFileComment?.()}
            />
          )}
        </div>
      )}
      {hunks.length > 0 && (
        <Diff
          viewType={viewType}
          diffType={diffType}
          hunks={shownHunks}
          tokens={tokens}
          widgets={widgets}
          selectedChanges={selectedChanges}
          gutterEvents={gutterEvents}
        >
          {(hunks: HunkData[]) => [
            ...hunks.flatMap((hunk, index) => [
              ...renderExpander(index, hunks.length),
              <Hunk key={hunk.content} hunk={hunk} />,
            ]),
            ...renderExpander(hunks.length, hunks.length),
          ]}
        </Diff>
      )}
    </div>
  );
}
