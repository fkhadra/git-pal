import { useState } from "react";

import { ShortcutRecorder } from "~/components/shortcut-recorder";

interface Props<A extends string> {
  title: string;
  labels: Record<A, string>;
  keybind: Readonly<Record<A, string>>;
  defaults?: Record<A, string>;
  allowBareKeys?: boolean;
  onSave: (keybind: Record<A, string>) => void;
}

export function KeybindList<A extends string>({
  title,
  labels,
  keybind,
  defaults,
  allowBareKeys,
  onSave,
}: Props<A>) {
  const [error, setError] = useState<string>();
  const actions = Object.keys(labels) as A[];

  const save = (action: A, value: string) => {
    const conflict = actions.find((a) => a !== action && keybind[a] === value);
    
    if (conflict) {
      setError(`Already used by "${labels[conflict]}"`);
      return;
    }

    setError(undefined);
    onSave({ ...keybind, [action]: value });
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <span className="text-sm font-medium">{title}</span>
      {actions.map((action) => (
        <div key={action} className="flex items-center gap-2 text-sm">
          <span className="flex-1 text-muted-foreground">{labels[action]}</span>
          <ShortcutRecorder
            className="w-44"
            value={keybind[action]}
            defaultValue={defaults?.[action]}
            allowBareKeys={allowBareKeys}
            onChange={(value) => save(action, value)}
          />
        </div>
      ))}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
