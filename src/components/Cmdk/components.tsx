import { Command } from "cmdk";
import { cn } from "~/libs/utils";
import "./style.css";

export function Heading({ label }: { label: React.ReactNode }) {
  return (
    <span className="mb-2 flex items-center gap-2 px-2 text-sm text-gray-400 select-none">
      {label}
    </span>
  );
}

export interface CommandItemProps
  extends React.ComponentProps<typeof Command.Item> {
  value: string;
}

export function CommandItem({
  className,
  children,
  ...props
}: CommandItemProps) {
  return (
    <div className="cmdk-item-wrapper relative select-none">
      <Command.Item
        className={cn(
          "data-[selected=true]:bg-opacity-20 flex min-h-12 cursor-pointer items-center gap-2 overflow-hidden rounded-lg px-2 py-0 select-none data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-40 data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-purple-600/90 data-[selected=true]:via-purple-500/60 data-[selected=true]:to-pink-500/20 data-[selected=true]:text-white dark:text-white [&>img]:size-5 [&>svg]:size-5",
          "pointer-events-none",
          className,
        )}
        {...props}
      >
        {children}
      </Command.Item>
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={() => {
          props.onSelect?.(props.value);
        }}
      />
    </div>
  );
}

export function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof Command.Empty>) {
  return (
    <Command.Empty
      className={cn(
        "flex h-12 items-center justify-center whitespace-pre-wrap",
        className,
      )}
      {...props}
    />
  );
}

export function CommandGroup({
  className,
  heading,
  children,
}: React.ComponentProps<typeof Command.Group>) {
  return (
    <Command.Group
      className={cn(
        "overflow-auto p-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-sm [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400",
        className,
      )}
    >
      {heading && <Heading label={heading} />}
      {children}
    </Command.Group>
  );
}
