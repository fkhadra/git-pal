import { cn } from "cn"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "pointer-events-none inline-flex max-h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm border border-kbd-border bg-kbd p-1 font-sans text-sm font-medium text-kbd-foreground select-none [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

function KbdGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="kbd-group"
      className={cn("flex items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup }
