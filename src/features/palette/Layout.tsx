export function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid w-full grid-cols-[36px_1fr_auto] items-center gap-2">
      {children}
    </div>
  );
}
