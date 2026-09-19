import { cn } from "cn";

import { Kbd, KbdGroup } from "~/components/ui/kbd";

export function Keybind({
  className,
  label,
  keys,
}: {
  className?: string;
  label?: string;
  keys: React.ReactNode[];
}) {
  return (
    <div className={cn("flex items-center gap-1 text-foreground", className)}>
      {label && <span>{label}</span>}
      <KbdGroup>
        {keys.map((v, i) => (
          <Kbd key={`kbd-${i}`}>{v}</Kbd>
        ))}
      </KbdGroup>
    </div>
  );
}

function Separator() {
  return <hr className="h-3 w-px border-0 bg-pink-300/40" />;
}

Keybind.Separator = Separator;
