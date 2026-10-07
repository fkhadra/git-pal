/** Right-side controls share a width so they line up. */
export const CONTROL_WIDTH = "w-56";

interface Props {
  label: string;
  description?: string;
  children: React.ReactNode;
}

export function SettingRow({ label, description, children }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 not-last:border-b first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm">{label}</span>
        {description && (
          <span className="text-xs text-muted-foreground">{description}</span>
        )}
      </div>
      {children}
    </div>
  );
}
