import { cn } from "~/libs/utils";

export function Hr({ className }: { className?: string }) {
  return <hr className={cn("h-px border-0 bg-pink-400/10", className)} />;
}
