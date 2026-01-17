import type { ComponentType } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cn } from "~/libs/utils";

export const buttonVariants = tv({
  base: `
    cursor-pointer
    disabled:opacity-50
    disabled:pointer-events-none
    inline-flex
    text-base
    shadow-md
    items-center
    justify-center
    whitespace-nowrap
    rounded-md
    transition-all
    active:scale-[.98]
    active:shadow-sm
    focus-visible:ring-2
    focus-visible:ring-offset-1
    font-medium
    outline-none
    `,
  variants: {
    variant: {
      default: "text-primary-foreground focus-visible:ring-primary",
      outline: "border-2 bg-transparent disabled:opacity-60",
    },
    size: {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3",
      lg: "h-11 rounded-md px-8",
      icon: "size-9 min-h-9 min-w-9 [&>svg]:size-6",
      iconSm: "size-6 min-h-6 min-w-6 [&>svg]:size-4",
    },
    color: {
      default: "bg-neutral-950 hover:bg-neutral-950/90",
      primary: "bg-primary hover:bg-primary/90",
      secondary: "bg-gray-700 hover:bg-gray-700/90",
      info: "bg-info hover:bg-info/90",
      alert: "bg-alert hover:bg-alert/80",
    },
  },
  compoundVariants: [
    {
      variant: "outline",
      color: "default",
      class:
        "border-foreground text-foreground bg-transparent hover:bg-foreground/10",
    },
    {
      variant: "outline",
      color: "primary",
      class: "border-primary text-primary bg-transparent hover:bg-primary/10",
    },
    {
      variant: "outline",
      color: "info",
      class: "border-info text-info bg-transparent hover:bg-info/10",
    },
    {
      variant: "outline",
      color: "alert",
      class: "border-alert text-alert bg-transparent hover:bg-alert/30",
    },
  ],
  defaultVariants: {
    variant: "default",
    size: "default",
    color: "default",
  },
});

type SlotableComponent = ComponentType<{ className?: string }>;

export type ButtonVariants = Omit<
  React.ComponentPropsWithRef<"button">,
  "color"
> &
  VariantProps<typeof buttonVariants>;

export interface ButtonProps extends ButtonVariants {
  isLoading?: boolean;
  leftSlot?: SlotableComponent;
  rightSlot?: SlotableComponent;
}

export function Button({
  className,
  variant,
  size,
  color,
  isLoading,
  children,
  leftSlot: LeftSlot,
  rightSlot: RightSlot,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className, color }))}
      disabled={isLoading}
      type="button"
      {...props}
    >
      {isLoading && (
        <span className="mr-2 size-5 animate-spin rounded-full border-2 border-zinc-200 border-r-zinc-400" />
      )}
      {LeftSlot && !isLoading && <LeftSlot className="mr-2 size-5" />}
      {children}
      {RightSlot && <RightSlot className="ml-2 size-5" />}
    </button>
  );
}
