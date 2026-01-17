import { Dialog as BaseDialog, DialogRootActions } from "@base-ui/react/dialog";
import { ReactElement, useRef } from "react";

export interface DialogContentProps {
  closeDialog: () => void;
}

export interface DialogProps extends React.ComponentProps<
  typeof BaseDialog.Root
> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  content?: (props: DialogContentProps) => ReactElement;
}

export function Dialog({ title, description, content, ...rest }: DialogProps) {
  const dialogRef = useRef<DialogRootActions>(null);

  return (
    <BaseDialog.Root {...rest} actionsRef={dialogRef}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="fixed inset-0 min-h-dvh bg-black/10 backdrop-blur-xs transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <BaseDialog.Popup className="text-primary-foreground fixed top-1/2 left-1/2 -mt-8 w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-50 p-6 outline-1 outline-pink-200/20 transition-all duration-150 data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:bg-black">
          {title && (
            <BaseDialog.Title className="-mt-1.5 mb-4 text-lg font-medium">
              {title}
            </BaseDialog.Title>
          )}

          {description && (
            <BaseDialog.Description className="text-secondary-foreground mb-6 text-base">
              {description}
            </BaseDialog.Description>
          )}

          {content &&
            content({
              closeDialog: () => dialogRef.current?.close(),
            })}
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}
