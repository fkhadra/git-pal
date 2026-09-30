import { cn } from "cn";
import { X } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";

import { ShortcutKeys } from "~/components/shortcut-keys";
import { Button } from "~/components/ui/button";
import { captureShortcut, shortcutToString } from "~/libs/keymap";

const MODIFIER_CODES = new Set([
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "MetaLeft",
  "MetaRight",
]);

interface Props {
  value: string;
  defaultValue?: string;
  className?: string;
  allowBareKeys?: boolean;
  onChange: (value: string) => void;
}

export function ShortcutRecorder({
  value,
  defaultValue,
  className,
  allowBareKeys,
  onChange,
}: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [preview, setPreview] = useState<string>();
  const pressed = useRef(new Set<string>());
  const captured = useRef<string>(undefined);

  const stop = () => {
    pressed.current.clear();
    captured.current = undefined;
    setPreview(undefined);
    setIsRecording(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!isRecording) return;

    e.preventDefault();

    if (!allowBareKeys && e.code === "Escape" && pressed.current.size === 0) {
      stop();
      return;
    }

    pressed.current.add(e.code);

    const shortcut = captureShortcut(e);
    const isModifier = MODIFIER_CODES.has(e.code);
    const hasModifier = allowBareKeys || shortcut.modifiers.length > 0;

    if (!isModifier && shortcut.mainKey.value && hasModifier) {
      captured.current = shortcutToString(shortcut);
    }

    setPreview(captured.current ?? modifiersOnly(e));
  };

  const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!isRecording) return;

    e.preventDefault();
    pressed.current.delete(e.code);

    if (!e.metaKey) {
      for (const code of pressed.current) {
        if (!MODIFIER_CODES.has(code)) pressed.current.delete(code);
      }
    }

    if (pressed.current.size > 0) return;

    const next = captured.current;
    stop();

    if (next && next !== value) onChange(next);
  };

  const canReset = defaultValue !== undefined && defaultValue !== value;

  return (
    <div
      className={cn(
        "flex h-8 items-center gap-1 rounded-md border pr-1 pl-2 has-[button:first-child:focus-visible]:border-ring has-[button:first-child:focus-visible]:ring-3 has-[button:first-child:focus-visible]:ring-ring/50",
        isRecording && "border-primary",
        className,
      )}
    >
      <button
        type="button"
        // WebKit skips buttons when tabbing
        tabIndex={0}
        className="flex h-full flex-1 items-center outline-none"
        onClick={(e) => {
          // WebKit doesn't focus buttons on click, key events would never arrive
          e.currentTarget.focus();
          setIsRecording(true);
        }}
        onBlur={stop}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
      >
        {isRecording && !preview && (
          <span className="text-xs text-muted-foreground">Press keys…</span>
        )}
        {(preview || !isRecording) && (
          <ShortcutKeys shortcut={preview ?? value} />
        )}
      </button>
      <Button
        variant="ghost"
        size="icon-xs"
        title="Reset to default"
        disabled={!canReset}
        onClick={() => defaultValue && onChange(defaultValue)}
      >
        <X />
      </Button>
    </div>
  );
}

function modifiersOnly(e: KeyboardEvent<HTMLButtonElement>) {
  const { modifiers } = captureShortcut(e);

  return modifiers.map((m) => m.value).join("+");
}
