import { insertHunk, textLinesToHunk } from "react-diff-view";
import type { HunkData } from "react-diff-view";

export const EXPAND_STEP = 20;

export type ExpandDirection = "up" | "down" | "all";

export interface Gap {
  start: number;
  end: number | null;
  offset: number;
}

function firstLine(start: number, count: number) {
  return count === 0 ? start + 1 : start;
}

function nextLine(start: number, count: number) {
  return count === 0 ? start + 1 : start + count;
}

export function findGap(
  hunks: HunkData[],
  index: number,
  lineCount?: number,
): Gap | null {
  const next = hunks[index];
  const previous = hunks[index - 1];
  const start = previous ? nextLine(previous.newStart, previous.newLines) : 1;

  const gap: Gap = next
    ? {
        start,
        end: firstLine(next.newStart, next.newLines),
        offset:
          firstLine(next.oldStart, next.oldLines) -
          firstLine(next.newStart, next.newLines),
      }
    : {
        start,
        end: lineCount == null ? null : lineCount + 1,
        offset:
          nextLine(previous.oldStart, previous.oldLines) -
          nextLine(previous.newStart, previous.newLines),
      };

  if (gap.end != null && gap.start >= gap.end) return null;

  return gap;
}

/**
 * Undoes `hunks` on the new source, react-diff-view wants the old one to highlight whole files:
 * a comment or string opened in a hidden line is then still closed.
 */
export function toOldSource(newSource: string, hunks: HunkData[]) {
  const lines = newSource.split("\n");
  // tokens replace the diff text, a source from another commit would show the wrong code
  const isSameCommit = hunks.every((hunk) =>
    hunk.changes.every(
      (change) =>
        change.type === "delete" ||
        lines[
          (change.type === "insert"
            ? change.lineNumber
            : change.newLineNumber) - 1
        ] === change.content,
    ),
  );
  if (!isSameCommit) return undefined;

  for (const { oldStart, changes } of hunks) {
    let cursor = oldStart - 1;
    for (const change of changes) {
      if (change.type === "insert") {
        lines.splice(cursor, 1);
        continue;
      }
      if (change.type === "delete") lines.splice(cursor, 0, change.content);
      cursor++;
    }
  }

  return lines.join("\n");
}

export function toLines(source: string) {
  const lines = source.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();

  return lines;
}

function range(gap: Gap, end: number, direction: ExpandDirection) {
  if (direction === "down") {
    return [gap.start, Math.min(gap.start + EXPAND_STEP, end)];
  }

  if (direction === "up") {
    return [Math.max(end - EXPAND_STEP, gap.start), end];
  }

  return [gap.start, end];
}

export function expandGap(
  hunks: HunkData[],
  lines: string[],
  gap: Gap,
  direction: ExpandDirection,
) {
  const end = gap.end ?? lines.length + 1;
  const [from, to] = range(gap, end, direction);
  const hunk = textLinesToHunk(
    lines.slice(from - 1, to - 1),
    from + gap.offset,
    from,
  );

  return hunk ? insertHunk(hunks, hunk) : hunks;
}
