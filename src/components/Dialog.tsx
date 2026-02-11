import { ComponentRenderFn } from "@base-ui/react";
import {
  Dialog as BaseDialog,
  DialogTriggerState,
} from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { HTMLProps, JSXElementConstructor, ReactElement } from "react";
import { cn } from "~/libs/utils";

export interface DialogProps extends React.ComponentProps<
  typeof BaseDialog.Root
> {
  trigger?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps<any>, DialogTriggerState>
    | undefined;
  title?: React.ReactNode;
  description?: React.ReactNode;
  content?: React.ReactNode;
  size?: "lg";
  withCloseButton?: boolean;
}

export function Dialog({
  title,
  description,
  content,
  trigger,
  size,
  withCloseButton,
  ...rest
}: DialogProps) {
  return (
    <BaseDialog.Root {...rest}>
      {trigger && <BaseDialog.Trigger render={trigger} />}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 min-h-dvh bg-black/10 backdrop-blur-xs transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <BaseDialog.Popup
          className={cn(
            "text-primary-foreground fixed top-1/2 left-1/2 -mt-8 w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-50 p-6 outline-1 outline-pink-200/20 transition-all duration-150 data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:bg-zinc-900",
            size && "w-lg",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            {title && (
              <BaseDialog.Title className="-mt-1.5 mb-4 text-lg font-medium">
                {title}
              </BaseDialog.Title>
            )}
            {withCloseButton && (
              <BaseDialog.Close
                aria-label="Close"
                className="text-muted-foreground focus-visible:outline-primary relative -top-2 -right-2 flex size-8 cursor-pointer items-center justify-center rounded-md border bg-zinc-950 text-base font-medium select-none hover:bg-zinc-900 focus-visible:outline-2 focus-visible:-outline-offset-1 active:bg-zinc-900"
              >
                <X className="h-[1.1rem] w-[1.1rem]" />
              </BaseDialog.Close>
            )}
          </div>

          {description && (
            <BaseDialog.Description className="text-secondary-foreground mb-6 text-base">
              {description}
            </BaseDialog.Description>
          )}

          {content}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
