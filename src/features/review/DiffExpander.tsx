import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";
import { Decoration } from "react-diff-view";

import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";

import { EXPAND_STEP, type ExpandDirection, type Gap } from "./diff-expansion";

interface Props {
  gap: Gap;
  isFirst: boolean;
  isLast: boolean;
  isLoading: boolean;
  onExpand: (direction: ExpandDirection) => void;
}

function ExpandButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button variant="ghost" size="icon-xs" title={title} onClick={onClick}>
      {children}
    </Button>
  );
}

export function DiffExpander({
  gap,
  isFirst,
  isLast,
  isLoading,
  onExpand,
}: Props) {
  const count = gap.end == null ? null : gap.end - gap.start;
  const isSmall = count != null && count <= EXPAND_STEP;

  return (
    <Decoration>
      <div className="flex items-center gap-1">
        {isLoading && <Spinner className="size-3" />}
        {!isLoading && !isSmall && !isLast && (
          <ExpandButton
            title={`Expand up ${EXPAND_STEP} lines`}
            onClick={() => onExpand("up")}
          >
            <ChevronUp />
          </ExpandButton>
        )}
        {!isLoading && !isSmall && !isFirst && (
          <ExpandButton
            title={`Expand down ${EXPAND_STEP} lines`}
            onClick={() => onExpand("down")}
          >
            <ChevronDown />
          </ExpandButton>
        )}
        {!isLoading && (
          <ExpandButton title="Expand all" onClick={() => onExpand("all")}>
            <ChevronsUpDown />
          </ExpandButton>
        )}
        {count != null && (
          <span>
            {count} hidden {count === 1 ? "line" : "lines"}
          </span>
        )}
      </div>
    </Decoration>
  );
}
