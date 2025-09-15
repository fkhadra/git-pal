import * as Primitive from "@radix-ui/react-switch";
import React from "react";
import { cn } from "~/libs/utils";

export const Switch = React.forwardRef<
  React.ElementRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(({ className, ...props }, ref) => (
  <Primitive.Root
    className={cn(
      `data-[state=checked]:bg-primary inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-zinc-600 transition-colors focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=unchecked]:bg-zinc-800`,

      className,
    )}
    {...props}
    id={props.id || props.name}
    ref={ref}
  >
    <Primitive.Thumb
      className={cn(
        `pointer-events-none block h-5 w-5 rounded-full bg-zinc-100 shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0`,
      )}
    />
  </Primitive.Root>
));

Switch.displayName = Primitive.Root.displayName;
