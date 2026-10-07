import { cn } from "cn";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Check,
  Ellipsis,
  FolderOpen,
  GitPullRequest,
  List,
  MessageSquareText,
  PanelLeftClose,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { ThinkingOrb } from "thinking-orbs";

import { AgentAvatar } from "~/components/agent-avatar";
import { HarnessLogo, HarnessName } from "~/components/harness";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { severityConfig } from "~/features/review/ReviewCommentWidget";
import { StatusBadge } from "~/features/review/StatusBadge";
import type { ReviewStatus } from "~/features/review/utils";
import { ViewedProgress } from "~/features/review/ViewedProgress";
import type { Harness } from "~/models/harness";

import type { DemoPullRequest } from "./PaletteDemo";

type LineType = "normal" | "insert" | "delete";

interface DiffLine {
  type: LineType;
  number: number;
  code: string;
}

interface DiffRow {
  old?: DiffLine;
  new?: DiffLine;
  /** The AI comment lands under this row */
  isCommented?: boolean;
}

interface DemoFile {
  name: string;
  additions: number;
  deletions: number;
}

const HARNESS: Harness = "claude";
const AUTHOR = "octocat";
const HEAD_REF = "fix-auth-redirect";

const FOLDER = "src/auth";

const FILES: DemoFile[] = [
  { name: "redirect.ts", additions: 2, deletions: 1 },
  { name: "session.ts", additions: 8, deletions: 3 },
  { name: "guard.ts", additions: 4, deletions: 0 },
];

// the reviewed file, first in the list
const FILE = FILES[0];

const IMPORT = 'import { redirect } from "../router";';
const SIGNATURE = "export function onLogin(params: URLSearchParams) {";
const NEXT = '  const next = params.get("next");';

const DIFF: DiffRow[] = [
  {
    old: { type: "normal", number: 10, code: IMPORT },
    new: { type: "normal", number: 10, code: IMPORT },
  },
  {
    old: { type: "normal", number: 11, code: "" },
    new: { type: "normal", number: 11, code: "" },
  },
  {
    old: { type: "normal", number: 12, code: SIGNATURE },
    new: { type: "normal", number: 12, code: SIGNATURE },
  },
  {
    old: { type: "normal", number: 13, code: NEXT },
    new: { type: "normal", number: 13, code: NEXT },
  },
  {
    old: { type: "delete", number: 14, code: '  redirect(next ?? "/");' },
    new: {
      type: "insert",
      number: 14,
      code: "  if (next) return redirect(next);",
    },
    isCommented: true,
  },
  { new: { type: "insert", number: 15, code: '  redirect("/");' } },
  {
    old: { type: "normal", number: 15, code: "}" },
    new: { type: "normal", number: 16, code: "}" },
  },
];

const LINE_STYLES: Record<LineType, string> = {
  normal: "",
  insert: "bg-success/10",
  delete: "bg-destructive/10",
};

// macOS window buttons
const TRAFFIC_LIGHTS = ["#ff5f57", "#febc2e", "#28c840"];

export type ReviewStage = "reviewing" | "commented" | "submitted" | "closing";

const STAGE_STATUS: Record<ReviewStage, ReviewStatus> = {
  reviewing: "inProgress",
  commented: "inProgress",
  submitted: "commented",
  closing: "commented",
};

function isSubmitted(stage: ReviewStage) {
  return stage === "submitted" || stage === "closing";
}

function TitleBar() {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 px-4">
      {TRAFFIC_LIGHTS.map((color) => (
        <span
          key={color}
          className="size-3 rounded-full"
          style={{ backgroundColor: color }}
        />
      ))}
      <span className="ml-3 text-sm font-medium text-muted-foreground">
        Git Pal - Reviews
      </span>
    </div>
  );
}

function HeaderDivider() {
  return (
    <Separator
      orientation="vertical"
      className="mx-1 h-4 data-vertical:self-center"
    />
  );
}

function SubmitButton({ stage }: { stage: ReviewStage }) {
  if (stage === "reviewing") {
    return (
      <Button size="xs">
        <ThinkingOrb state="solving" size={20} />
        Reviewing with
        <HarnessName harness={HARNESS} />
      </Button>
    );
  }

  return (
    <Button size="xs">
      <Send />
      Submit review
      {!isSubmitted(stage) && (
        <span className="rounded-full bg-current/20 px-1.5 text-xs">1</span>
      )}
    </Button>
  );
}

function Header({
  pullRequest,
  stage,
}: {
  pullRequest: DemoPullRequest;
  stage: ReviewStage;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm">
          <PanelLeftClose />
        </Button>
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
          <span className="truncate">{pullRequest.title}</span>
          <span className="shrink-0 text-muted-foreground">
            (<span className="text-primary">#{pullRequest.number}</span>)
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs font-normal text-muted-foreground">
            <GitPullRequest className="size-4 text-success" />
            Ready to merge
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-1">
        <div className="mr-auto flex min-w-0 items-center gap-1.5 pl-2 text-xs text-muted-foreground">
          <span>by</span>
          <span className="size-4 rounded-full bg-info/40" />
          {AUTHOR}
          <span>·</span>
          <span className="truncate font-mono">{HEAD_REF}</span>
          <ArrowRight className="size-3 shrink-0" />
          <span className="font-mono">{pullRequest.baseRef}</span>
        </div>
        <StatusBadge status={STAGE_STATUS[stage]} />
        {stage !== "reviewing" && (
          <Button variant="ghost" size="icon-sm">
            <HarnessLogo harness={HARNESS} className="size-4" />
          </Button>
        )}
        <HeaderDivider />
        <ViewedProgress viewed={0} total={FILES.length} />
        <Button variant="ghost" size="icon-sm" disabled>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-[4ch] text-center text-xs text-muted-foreground">
          1/{FILES.length}
        </span>
        <Button variant="ghost" size="icon-sm">
          <ChevronRight className="size-4" />
        </Button>
        <HeaderDivider />
        <Button variant="ghost" size="icon-sm">
          <MessageSquareText />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <RefreshCw />
        </Button>
        <HeaderDivider />
        <SubmitButton stage={stage} />
        <Button variant="ghost" size="icon-sm">
          <AgentAvatar size={18} />
        </Button>
        <Button variant="ghost" size="icon-sm">
          <Ellipsis />
        </Button>
      </div>
    </div>
  );
}

function FakeInput({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-lg border px-2.5 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function Reviews({
  pullRequest,
  stage,
}: {
  pullRequest: DemoPullRequest;
  stage: ReviewStage;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 pb-2">
        <FakeInput>
          <GitPullRequest className="size-4" />
          Paste PR URL
        </FakeInput>
      </div>
      <div className="flex items-center gap-2 px-4 pt-3 pb-1">
        <List className="size-3.5 text-muted-foreground" />
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Reviews
        </span>
      </div>
      <div className="px-3 py-2">
        <FakeInput>
          <Search className="size-4" />
          Search reviews…
        </FakeInput>
      </div>
      <div className="flex flex-1 flex-col px-2">
        <div className="rounded-lg bg-accent px-3 py-2.5">
          <div className="truncate text-sm">{pullRequest.title}</div>
          <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
            {pullRequest.repository} #{pullRequest.number}
          </div>
          <StatusBadge status={STAGE_STATUS[stage]} className="mt-1 w-fit" />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t p-3 text-sm text-muted-foreground">
        <SlidersHorizontal className="size-4" />
        Manage templates…
      </div>
    </div>
  );
}

function FileTree() {
  const additions = FILES.reduce((sum, file) => sum + file.additions, 0);
  const deletions = FILES.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-4 text-xs font-medium text-muted-foreground">
        <span className="whitespace-nowrap">
          Files changed ({FILES.length})
        </span>
        <span className="ml-auto font-mono text-success">+{additions}</span>
        <span className="font-mono text-destructive">-{deletions}</span>
      </div>
      <div className="flex flex-col gap-px p-2 text-sm">
        <span className="flex items-center gap-1.5 px-2 py-1.5 text-muted-foreground">
          <ChevronDown className="size-3.5" />
          <FolderOpen className="size-3.5" />
          {FOLDER}
        </span>
        {FILES.map((file) => (
          <span
            key={file.name}
            className={cn(
              "flex items-center gap-2 rounded-md py-1.5 pr-2 pl-9",
              file === FILE && "bg-accent",
            )}
          >
            <span className="font-mono text-[10px] font-bold text-warning">
              M
            </span>
            <span className="truncate">{file.name}</span>
            <span className="ml-auto flex gap-1 font-mono text-[10px]">
              <span className="text-success">+{file.additions}</span>
              {file.deletions > 0 && (
                <span className="text-destructive">-{file.deletions}</span>
              )}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Comment({ stage }: { stage: ReviewStage }) {
  const config = severityConfig.warning;

  return (
    <div
      className={cn(
        "mx-3 my-2 animate-in rounded-lg border bg-card p-3 font-sans text-xs shadow-sm duration-300 fade-in slide-in-from-top-1",
        config.accent,
      )}
    >
      <div className="flex items-center gap-2">
        <config.icon className={cn("size-3.5 shrink-0", config.text)} />
        <span className={cn("font-medium", config.text)}>{config.label}</span>
        <span className="text-muted-foreground">Line 14</span>
        {isSubmitted(stage) ? (
          <CircleCheck className="ml-auto size-4 text-success" />
        ) : (
          <Button size="xs" className="ml-auto h-6">
            <Check />
            In review
          </Button>
        )}
      </div>
      <p className="mt-1 pl-5.5 text-foreground/80">
        <code className="text-foreground">next</code> isn&apos;t validated, this
        allows open redirects.
      </p>
    </div>
  );
}

function Cell({ line }: { line?: DiffLine }) {
  if (!line) return <div className="flex-1 bg-muted/40" />;

  return (
    <div className={cn("flex min-w-0 flex-1", LINE_STYLES[line.type])}>
      <span className="w-10 shrink-0 pr-3 text-right text-muted-foreground">
        {line.number}
      </span>
      <span className="truncate whitespace-pre">{line.code}</span>
    </div>
  );
}

function Diff({ stage }: { stage: ReviewStage }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-4 text-xs">
        <span className="font-mono font-medium">
          {FOLDER}/{FILE.name}
        </span>
        <span className="font-mono text-muted-foreground">
          +{FILE.additions} -{FILE.deletions}
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-muted-foreground">
          <span className="size-3.5 rounded-sm border" />
          Viewed
        </span>
      </div>
      <div className="font-mono text-xs leading-6">
        {DIFF.map((row, index) => (
          <div key={index}>
            <div className="flex">
              <Cell line={row.old} />
              <Cell line={row.new} />
            </div>
            {row.isCommented && stage !== "reviewing" && (
              <div className="ml-[50%]">
                <Comment stage={stage} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-background shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface Props {
  pullRequest: DemoPullRequest;
  stage: ReviewStage;
  style?: React.CSSProperties;
  className?: string;
}

/** Mock of the review window, the AI comment appears once reviewed. */
export function ReviewDemo({ pullRequest, stage, style, className }: Props) {
  return (
    <div
      style={style}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-sidebar text-foreground shadow-2xl shadow-black/40 duration-300",
        stage === "closing"
          ? "animate-out fill-mode-forwards zoom-out-95 fade-out"
          : "animate-in zoom-in-95 fade-in",
        className,
      )}
    >
      <TitleBar />
      <Header pullRequest={pullRequest} stage={stage} />
      <div className="flex min-h-0 flex-1 gap-2 px-2 pb-2">
        <Panel className="w-56 shrink-0">
          <Reviews pullRequest={pullRequest} stage={stage} />
        </Panel>
        <Panel className="w-72 shrink-0">
          <FileTree />
        </Panel>
        <Panel className="min-w-0 flex-1">
          <Diff stage={stage} />
        </Panel>
      </div>
    </div>
  );
}
