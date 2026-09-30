const RADIUS = 7;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ViewedProgress({
  viewed,
  total,
}: {
  viewed: number;
  total: number;
}) {
  const ratio = total > 0 ? viewed / total : 0;

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <svg viewBox="0 0 18 18" className="size-4 -rotate-90">
        <circle
          cx="9"
          cy="9"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          className="stroke-muted"
        />
        <circle
          cx="9"
          cy="9"
          r={RADIUS}
          fill="none"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
          className="stroke-success transition-[stroke-dashoffset]"
        />
      </svg>
      <span>
        <span className="font-medium text-foreground">{viewed}</span> /{" "}
        <span className="font-medium text-foreground">{total}</span> viewed
      </span>
    </span>
  );
}
