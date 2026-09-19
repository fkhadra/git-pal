import { cn } from "cn";
import React from "react";

import { ErrorMessage } from "./input";

type TextAreaProps = {
  error?: string;
  maxHeight?: number;
} & React.ComponentPropsWithRef<"textarea">;

export function Textarea({
  maxHeight = 160,
  className,
  onChange,
  value,
  ref,
  error,
  ...props
}: TextAreaProps) {
  const nodeRef = React.useRef<HTMLTextAreaElement>(null);
  const computeHeight = React.useCallback(() => {
    const node = nodeRef.current;

    if (!node) return;

    node.style.height = "auto";
    const scrollHeight = node.scrollHeight;

    node.style.height = `${scrollHeight > maxHeight ? maxHeight : scrollHeight}px`;
  }, []);
  const setRef = React.useCallback(
    (el: HTMLTextAreaElement) => {
      if (typeof ref === "function") {
        ref(el);
      } else if (ref?.current) {
        ref.current = el;
      }

      nodeRef.current = el;
      computeHeight();
    },
    [ref, computeHeight],
  );

  return (
    <div>
      <textarea
        {...props}
        id={props.id || props.name}
        ref={setRef}
        rows={3}
        className={cn(
          `disabled:text-opacity-90 flex h-10 w-full resize-none items-center rounded-lg border border-primary/10 bg-background px-3 py-2 text-foreground caret-primary shadow ring-primary/50 transition-shadow placeholder:text-muted-foreground hover:ring-1 hover:ring-primary/70 focus-visible:shadow-[0_0_4px_1px] focus-visible:shadow-primary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:border-none disabled:bg-input/50 disabled:opacity-50 dark:bg-input dark:disabled:bg-input/80`,
          className,
        )}
        onChange={(e) => {
          computeHeight();
          onChange?.(e);
        }}
      />
      <ErrorMessage error={error} />
    </div>
  );
}
