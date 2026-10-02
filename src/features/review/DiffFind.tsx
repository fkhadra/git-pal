import { ChevronDown, ChevronUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const MATCH_HIGHLIGHT = "diff-find";
const CURRENT_HIGHLIGHT = "diff-find-current";
const CODE_CELL = ".diff-code";

function locate(nodes: Text[], index: number) {
  let offset = index;
  for (const node of nodes) {
    if (offset <= node.data.length) return { node, offset };
    offset -= node.data.length;
  }

  const last = nodes[nodes.length - 1];
  return { node: last, offset: last.data.length };
}

function textNodes(cell: Element) {
  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    nodes.push(node as Text);
  }

  return nodes;
}

function findRanges(root: HTMLElement, query: string) {
  const needle = query.toLowerCase();
  const ranges: Range[] = [];

  root.querySelectorAll(CODE_CELL).forEach((cell) => {
    const nodes = textNodes(cell);
    const text = nodes
      .map((n) => n.data)
      .join("")
      .toLowerCase();

    for (
      let i = text.indexOf(needle);
      i !== -1;
      i = text.indexOf(needle, i + needle.length)
    ) {
      const start = locate(nodes, i);
      const end = locate(nodes, i + needle.length);
      const range = document.createRange();

      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      ranges.push(range);
    }
  });

  return ranges;
}


function clearHighlights() {
  for (const name of [MATCH_HIGHLIGHT, CURRENT_HIGHLIGHT]) {
    
    CSS.highlights.get(name)?.clear();
    CSS.highlights.delete(name);
  }
}

interface Props {
  containerRef: React.RefObject<HTMLElement | null>;
  focusKey: number;
  onClose: () => void;
}

// like cmd+f
export function DiffFind({ containerRef, focusKey, onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [ranges, setRanges] = useState<Range[]>([]);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusKey]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const search = () => {
      setRanges(query ? findRanges(container, query) : []);
    };

    search();
    const observer = new MutationObserver(search);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [containerRef, query]);

  const index = Math.min(current, Math.max(ranges.length - 1, 0));

  useEffect(() => {
    clearHighlights();
    if (ranges.length === 0) return;

    // https://developer.mozilla.org/en-US/docs/Web/API/CSS_Custom_Highlight_API
    // baseline 2025 not sure if it's old enough
    CSS.highlights.set(MATCH_HIGHLIGHT, new Highlight(...ranges));
    CSS.highlights.set(CURRENT_HIGHLIGHT, new Highlight(ranges[index]));

    ranges[index].startContainer.parentElement?.scrollIntoView({
      block: "center",
    });
  }, [ranges, index]);

  useEffect(() => clearHighlights, []);

  const step = (offset: number) => {
    if (ranges.length === 0) return;

    setCurrent((index + offset + ranges.length) % ranges.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key !== "Enter") return;

    e.preventDefault();
    step(e.shiftKey ? -1 : 1);
  };

  const position = ranges.length > 0 ? index + 1 : 0;

  return (
    <div className="absolute top-11 right-4 z-20 flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-md">
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setCurrent(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Find in file"
        className="h-7 w-52 text-xs"
      />
      <span className="min-w-12 text-center text-xs text-muted-foreground tabular-nums">
        {query && `${position}/${ranges.length}`}
      </span>
      <Button
        variant="ghost"
        size="icon-xs"
        title="Previous match"
        disabled={ranges.length === 0}
        onClick={() => step(-1)}
      >
        <ChevronUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        title="Next match"
        disabled={ranges.length === 0}
        onClick={() => step(1)}
      >
        <ChevronDown />
      </Button>
      <Button variant="ghost" size="icon-xs" title="Close" onClick={onClose}>
        <X />
      </Button>
    </div>
  );
}
