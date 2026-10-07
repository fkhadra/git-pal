import { cn } from "cn";

import { type SlotableComponent } from "~/components/types";

interface Props {
  icon?: SlotableComponent;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Section({
  icon: Icon,
  title,
  description,
  children,
  className,
}: Props) {
  return (
    <section
      className={cn("flex flex-col rounded-xl border bg-card", className)}
    >
      <header className="flex flex-col gap-1 border-b px-4 py-3">
        <h2 className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {Icon && <Icon className="size-3.5" />}
          {title}
        </h2>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </header>
      <div className="flex flex-1 flex-col p-4">{children}</div>
    </section>
  );
}
