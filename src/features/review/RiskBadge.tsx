import { cn } from "cn";
import { File } from "lucide-react";
import { Fragment } from "react";

import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import type {
  AutoApproval,
  Confidence,
  Risk,
  RiskFactor,
  RiskFactorKind,
  RiskLevel,
} from "~/models/code-review";

const LEVELS: RiskLevel[] = ["minimal", "low", "medium", "high"];

const LEVEL_LABELS: Record<RiskLevel, string> = {
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
};

// one hue per gauge, the level's
const LEVEL_FILLS: Record<RiskLevel, string> = {
  minimal: "bg-success",
  low: "bg-info",
  medium: "bg-warning",
  high: "bg-destructive",
};

type KnownFactorKind = Exclude<RiskFactorKind, "unknown">;

// worded so that high always reads as risky
const FACTOR_LABELS: Record<KnownFactorKind, string> = {
  blastRadius: "Blast radius",
  sensitiveAreas: "Sensitive areas",
  testCoverage: "Test gaps",
  reversibility: "Rollback difficulty",
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const SEGMENT_SIZES = {
  sm: "h-1 w-1.5",
  md: "h-1.5 w-3",
  lg: "h-1.5 w-6",
};

function Segments({
  level,
  size,
}: {
  level: RiskLevel;
  size: keyof typeof SEGMENT_SIZES;
}) {
  const filled = LEVELS.indexOf(level);

  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {LEVELS.map((step, index) => (
        <span
          key={step}
          className={cn(
            "rounded-full",
            SEGMENT_SIZES[size],
            index <= filled ? LEVEL_FILLS[level] : "bg-foreground/15",
          )}
        />
      ))}
    </span>
  );
}

/** Renders the `code` spans the agent writes. */
function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) =>
        index % 2 === 1 ? (
          <code
            key={index}
            className="rounded bg-muted px-1 font-mono text-[0.85em]"
          >
            {part}
          </code>
        ) : (
          part
        ),
      )}
    </>
  );
}

function approvalLabel(approval: AutoApproval) {
  if (approval.type === "approved") return "Approved automatically";

  return `Not auto-approved: ${approval.reason}`;
}

/** Compact risk for the reviews list. */
export function RiskIcon({ level }: { level: RiskLevel }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="flex items-center">
            <Segments level={level} size="sm" />
          </span>
        }
      />
      <TooltipContent>{LEVEL_LABELS[level]} merge risk</TooltipContent>
    </Tooltip>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-t pt-3">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function isKnown(
  factor: RiskFactor,
): factor is RiskFactor & { kind: KnownFactorKind } {
  return factor.kind !== "unknown";
}

/** Riskiest first. */
function Factors({ factors }: { factors: RiskFactor[] }) {
  const sorted = factors
    .filter(isKnown)
    .sort((a, b) => LEVELS.indexOf(b.level) - LEVELS.indexOf(a.level));

  return (
    <div className="grid grid-cols-[auto_auto_1fr] items-baseline gap-x-3 gap-y-2">
      {sorted.map(({ kind, level, note }) => (
        <Fragment key={kind}>
          <span>{FACTOR_LABELS[kind]}</span>
          <span className="flex items-center gap-1.5">
            <Segments level={level} size="sm" />
            <span className="w-12 text-xs text-muted-foreground">
              {LEVEL_LABELS[level]}
            </span>
          </span>
          <span className="text-xs text-muted-foreground">
            <InlineCode text={note} />
          </span>
        </Fragment>
      ))}
    </div>
  );
}

function Reasons({ reasons }: { reasons: string[] }) {
  if (reasons.length === 1) {
    return (
      <p>
        <InlineCode text={reasons[0]} />
      </p>
    );
  }

  return (
    <ul className="list-disc space-y-1 pl-4">
      {reasons.map((reason) => (
        <li key={reason}>
          <InlineCode text={reason} />
        </li>
      ))}
    </ul>
  );
}

function FileName({ file }: { file: string }) {
  const index = file.lastIndexOf("/");

  return (
    <>
      <File className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="shrink-0 font-medium">{file.slice(index + 1)}</span>
      <span className="truncate text-xs text-muted-foreground">
        {file.slice(0, Math.max(index, 0))}
      </span>
    </>
  );
}

interface Props {
  risk: Risk;
  autoApproval: AutoApproval | null;
  /** Files in the diff, the others can't be opened */
  changedFiles: string[];
  onSelectFile: (filename: string) => void;
}

export function RiskBadge({
  risk,
  autoApproval,
  changedFiles,
  onSelectFile,
}: Props) {
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        render={
          <Button variant="ghost" size="xs" className="shrink-0 gap-1.5">
            <span className="text-muted-foreground">Merge risk</span>
            <Segments level={risk.level} size="md" />
            <span className="font-medium">{LEVEL_LABELS[risk.level]}</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-[32rem]">
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">Merge Risk Assessment</span>
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              {/* the trigger already names the level */}
              <span role="img" aria-label={`${LEVEL_LABELS[risk.level]} risk`}>
                <Segments level={risk.level} size="lg" />
              </span>
              {risk.confidence && (
                <span>· {CONFIDENCE_LABELS[risk.confidence]}</span>
              )}
            </span>
          </div>

          {risk.reasons.length > 0 && <Reasons reasons={risk.reasons} />}

          {risk.factors.length > 0 && (
            <Section title="Factors">
              <Factors factors={risk.factors} />
            </Section>
          )}

          {risk.files.length > 0 && (
            <Section title="Risky files">
              <ul className="flex flex-col gap-2">
                {risk.files.map(({ file, reason }) => (
                  <li key={file} className="flex min-w-0 flex-col gap-0.5">
                    {changedFiles.includes(file) ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="-mx-1.5 h-auto min-w-0 justify-start px-1.5 py-0.5 text-sm font-normal"
                        onClick={() => onSelectFile(file)}
                      >
                        <FileName file={file} />
                      </Button>
                    ) : (
                      <span className="flex min-w-0 items-center gap-1">
                        <FileName file={file} />
                      </span>
                    )}
                    {reason && (
                      <span className="pl-[1.125rem] text-xs text-muted-foreground">
                        <InlineCode text={reason} />
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {autoApproval && (
            <span className="border-t pt-3 text-xs text-muted-foreground">
              {approvalLabel(autoApproval)}
            </span>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
