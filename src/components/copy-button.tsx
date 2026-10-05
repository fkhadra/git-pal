import { cn } from "cn";
import { Check, Copy } from "lucide-react";

import { SlidingContent } from "~/components/sliding-content";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useCopyContent } from "~/hooks";

interface Props {
  content: string;
  message?: string;
  className?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
}

export function CopyButton({
  content,
  message = "Copy Content",
  className,
  size = "icon",
  variant = "secondary",
}: Props) {
  const { handleCopy, isCopying } = useCopyContent();

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            size={size}
            variant={variant}
            aria-label={message}
            onClick={() => {
              handleCopy(content);
            }}
            className={cn("relative overflow-hidden", className)}
          >
            <SlidingContent
              from={<Copy />}
              to={<Check className="text-success" />}
              toggle={isCopying}
            />
          </Button>
        }
      />
      <TooltipContent>{message}</TooltipContent>
    </Tooltip>
  );
}
