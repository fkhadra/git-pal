import { cn } from "cn";

import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

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
