import { cn } from "cn";
import { ChevronDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

import { store } from "./store";

interface Props {
  tooltip: string;
  active?: boolean;
  className?: string;
  onClick: () => void;
  children: React.ReactNode;
}

export function ActionButton({
  tooltip,
  active,
  className,
  onClick,
  children,
}: Props) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={active ? "secondary" : "ghost"}
            size="icon-xs"
            aria-label={tooltip}
            className={cn("shrink-0", className)}
            onClick={onClick}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}


export function StateIcon({
  tooltip,
  children,
}: {
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            aria-label={tooltip}
            className="flex size-6 shrink-0 items-center justify-center [&_svg]:size-3"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function CollapseButton({
  id,
  isCollapsed,
}: {
  id: string;
  isCollapsed: boolean;
}) {
  return (
    <ActionButton
      tooltip={isCollapsed ? "Expand" : "Collapse"}
      onClick={() => store.toggleCollapsed(id)}
    >
      <ChevronDown
        className={cn("transition-transform", isCollapsed && "-rotate-90")}
      />
    </ActionButton>
  );
}
