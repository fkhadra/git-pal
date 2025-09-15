import { cn } from "~/libs/utils";

export function Keybind({
  className,
  label,
  keys,
}: {
  className?: string;
  label: string;
  keys: React.ReactNode[];
}) {
  return (
    <div className={cn("text-foreground flex items-center gap-1", className)}>
      <span>{label}</span>
      {keys.length > 1 ? (
        <Group>
          {keys.map((v, i) => (
            <Key key={i}>{v}</Key>
          ))}
        </Group>
      ) : (
        keys.map((v, i) => <Key key={i}>{v}</Key>)
      )}
    </div>
  );
}

function Separator() {
  return <hr className="h-[12px] w-[1px] border-0 bg-pink-300/40" />;
}

Keybind.Separator = Separator;

function Group({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-1">{children}</div>;
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex max-h-5 w-fit min-w-5 items-center justify-center rounded-[4px] border border-pink-300/40 bg-zinc-900 p-1 text-pink-200">
      {children}
    </kbd>
  );
}
