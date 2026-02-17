import React from "react";
import { cn } from "~/libs/utils";

type TextAreaProps = {
  maxHeight?: number;
} & React.ComponentPropsWithRef<"textarea">;

export function Textarea({
  maxHeight = 160,
  className,
  onChange,
  value,
  ref,
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
    <textarea
      {...props}
      id={props.id || props.name}
      ref={setRef}
      rows={3}
      className={cn(
        `caret-primary ring-primary/50 text-foreground border-primary/10 disabled:text-opacity-90 bg-background dark:bg-input focus-visible:shadow-primary hover:ring-primary/70 disabled:bg-input/50 dark:disabled:bg-input/80 placeholder:text-muted-foreground flex h-10 w-full resize-none items-center rounded-lg border px-3 py-2 shadow transition-shadow hover:ring-1 focus-visible:shadow-[0_0_4px_1px] focus-visible:outline-hidden disabled:cursor-not-allowed disabled:border-none disabled:opacity-50`,
        className,
      )}
      onChange={(e) => {
        computeHeight();
        onChange?.(e);
      }}
    />
  );
}
