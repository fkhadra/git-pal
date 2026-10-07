import { cn } from "cn";
import { Fragment, useEffect, useState } from "react";

import { PaletteDemo, PULL_REQUESTS, QUERY } from "./PaletteDemo";
import { ReviewDemo } from "./ReviewDemo";

const TYPE_MS = 120;
const SELECT_MS = 650;
const OPEN_MS = 450;
const REVIEWING_MS = 1800;
const COMMENTED_MS = 2600;
const SUBMITTED_MS = 1800;
const CLOSING_MS = 300;
const RESTART_MS = 500;

// the pull request the query finds, then reviewed
const TARGET = PULL_REQUESTS[1];

// mocks are laid out at the app's size, then shrunk
const PALETTE_SIZE = { width: 640, height: 560, zoom: 0.6 };
const REVIEW_SIZE = { width: 1200, height: 660, zoom: 0.55 };

type Phase =
  | "search"
  | "open"
  | "reviewing"
  | "commented"
  | "submitted"
  | "closing";

interface DemoState {
  phase: Phase;
  typed: number;
}

const STEPS = ["Find", "Review", "Submit"];

const PHASE_STEPS: Record<Phase, number> = {
  search: 0,
  open: 0,
  reviewing: 1,
  commented: 1,
  submitted: 2,
  closing: 2,
};

// shown as is when motion is reduced, the most telling frame
const STILL: DemoState = {
  phase: "commented",
  typed: QUERY.length,
};

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Finds a pull request in the palette, reviews it, submits, forever. */
function useDemo() {
  const [state, setState] = useState<DemoState>(STILL);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;

    const step = async (ms: number, next: Partial<DemoState>) => {
      await wait(ms);
      if (cancelled) return false;

      setState((s) => ({ ...s, ...next }));
      return true;
    };

    const play = async () => {
      while (!cancelled) {
        setState({ phase: "search", typed: 0 });

        for (let typed = 1; typed <= QUERY.length; typed++) {
          if (!(await step(TYPE_MS, { typed }))) return;
        }

        if (!(await step(SELECT_MS, { phase: "open" }))) return;
        if (!(await step(OPEN_MS, { phase: "reviewing" }))) return;
        if (!(await step(REVIEWING_MS, { phase: "commented" }))) return;
        if (!(await step(COMMENTED_MS, { phase: "submitted" }))) return;
        if (!(await step(SUBMITTED_MS, { phase: "closing" }))) return;

        await wait(CLOSING_MS + RESTART_MS);
      }
    };

    play();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function Captions({ active }: { active: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((label, index) => (
        <Fragment key={label}>
          {index > 0 && <span className="text-muted-foreground/50">→</span>}
          <li
            className={cn(
              "flex items-center gap-1.5 transition-colors duration-300",
              index === active ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full transition-colors duration-300",
                index === active ? "bg-foreground" : "bg-muted-foreground/40",
              )}
            />
            {label}
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

/** What the app does, played before signing in. */
export function SetupDemo() {
  const { phase, typed } = useDemo();
  const isSearching = phase === "search" || phase === "open";

  return (
    <div
      aria-hidden
      className="pointer-events-none flex w-full max-w-3xl flex-col items-center gap-4"
    >
      {/* the review opens in its own window, over the palette */}
      <div className="relative h-[420px] w-full">
        <div
          style={PALETTE_SIZE}
          className={cn(
            "absolute top-0 left-0 overflow-hidden rounded-xl border border-foreground/15 bg-popover text-popover-foreground shadow-2xl shadow-brand/10 transition duration-300",
            !isSearching && "scale-[0.97] opacity-40",
          )}
        >
          <PaletteDemo typed={typed} isOpening={phase === "open"} />
        </div>

        {!isSearching && (
          <ReviewDemo
            pullRequest={TARGET}
            stage={phase}
            style={REVIEW_SIZE}
            className="absolute top-14 right-0"
          />
        )}
      </div>

      <Captions active={PHASE_STEPS[phase]} />
    </div>
  );
}
