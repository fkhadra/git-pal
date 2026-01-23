import {
  ComponentRenderFn,
  DialogCloseState,
  DialogTriggerState,
} from "@base-ui/react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";
import { HTMLProps, JSXElementConstructor, ReactElement } from "react";
import { Button } from "./Button";

export interface AlertDialogProps extends React.ComponentProps<
  typeof BaseAlertDialog.Root
> {
  trigger?:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps<any>, DialogTriggerState>
    | undefined;
  title: React.ReactNode;
  description: React.ReactNode;
  action:
    | ReactElement<unknown, string | JSXElementConstructor<any>>
    | ComponentRenderFn<HTMLProps<any>, DialogCloseState>;
}

export default function AlertDialog({
  trigger,
  title,
  description,
  action,
}: AlertDialogProps) {
  return (
    <BaseAlertDialog.Root>
      {trigger && <BaseAlertDialog.Trigger render={trigger} />}
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className="fixed inset-0 min-h-dvh bg-black/10 backdrop-blur-xs transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute" />
        <BaseAlertDialog.Popup className="text-primary-foreground fixed top-1/2 left-1/2 -mt-8 w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 rounded-lg bg-gray-50 p-6 outline-1 outline-pink-200/20 transition-all duration-150 data-ending-style:scale-90 data-ending-style:opacity-0 data-starting-style:scale-90 data-starting-style:opacity-0 dark:bg-zinc-900">
          <BaseAlertDialog.Title className="-mt-1.5 mb-1 text-lg font-medium">
            {title}
          </BaseAlertDialog.Title>
          <BaseAlertDialog.Description className="text-muted-foreground mb-6 text-base">
            {description}
          </BaseAlertDialog.Description>
          <div className="flex justify-end gap-4">
            <BaseAlertDialog.Close
              render={<Button variant="secondary">Cancel</Button>}
            />
            <BaseAlertDialog.Close render={action} />
          </div>
        </BaseAlertDialog.Popup>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
