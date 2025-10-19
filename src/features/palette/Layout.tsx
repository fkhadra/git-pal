export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full grid-cols-[36px_1fr_auto] items-center gap-2">
      {children}
    </div>
  );
}

export function IconWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid size-9 place-items-center overflow-hidden rounded-lg bg-zinc-900 inset-shadow-xs inset-shadow-zinc-700">
      {children}
    </div>
  );
}
