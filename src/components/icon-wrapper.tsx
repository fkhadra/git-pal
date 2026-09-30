export function IconWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid size-9 place-items-center overflow-hidden rounded-lg border bg-sidebar inset-shadow-xs inset-shadow-foreground/10">
      {children}
    </div>
  );
}
