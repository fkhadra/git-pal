export function IconWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid size-9 place-items-center overflow-hidden rounded-lg bg-zinc-900 inset-shadow-xs inset-shadow-zinc-700">
      {children}
    </div>
  );
}
