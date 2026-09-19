import { cn } from "cn";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "~/components/ui/button";

export interface InputProps extends React.ComponentPropsWithRef<"input"> {
  leftSlot?: React.ReactElement | false;
  rightSlot?: React.ReactElement | false;
  error?: string;
  wrapperClassName?: string;
}

export function Input({
  error,
  className,
  leftSlot,
  rightSlot,
  wrapperClassName,
  ...inputProps
}: InputProps) {
  const hasSlot = !!leftSlot || !!rightSlot;

  const baseStyle = cn(
    `disabled:text-opacity-90 flex h-10 w-full items-center rounded-lg border border-1 border-primary/10 bg-background px-3 py-2 text-foreground caret-primary shadow ring-primary/50 transition-colors transition-shadow file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground hover:ring-1 hover:ring-primary/70 focus-visible:shadow-[0_0_4px_1px] focus-visible:shadow-primary focus-visible:outline-hidden disabled:cursor-not-allowed disabled:border-none disabled:bg-input/50 disabled:opacity-50 dark:bg-input dark:disabled:bg-input/80`,
    !!error &&
      `caret-alert ring-1 ring-alert hover:ring-alert focus-visible:shadow-alert disabled:border-2 disabled:border-solid`,
  );

  return (
    <div className={wrapperClassName}>
      {hasSlot ? (
        <div
          className={cn(
            baseStyle,
            `has-[input:focus-visible]:shadow-[0_0_4px_1px] has-[input:focus-visible]:shadow-primary`,
            !!error && "has-[input:focus-visible]:shadow-alert",
            className,
          )}
        >
          {leftSlot}
          <input
            type="text"
            autoCorrect="off"
            {...inputProps}
            id={inputProps.id || inputProps.name}
            className="w-full border-none bg-transparent outline-hidden"
          />
          {rightSlot}
        </div>
      ) : (
        <input
          type="text"
          autoCorrect="off"
          className={cn(baseStyle, className)}
          {...inputProps}
          id={inputProps.id || inputProps.name}
        />
      )}
      <ErrorMessage error={error} />
    </div>
  );
}

export function ErrorMessage({
  error,
  className,
}: {
  error?: React.ReactNode;
  className?: string;
}) {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          className={cn("flex content-center items-center gap-2", className)}
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{
            opacity: 1,
            height: "auto",
            marginTop: "8px",
          }}
          exit={{ opacity: 0.1, height: 0, marginTop: 0 }}
        >
          <AlertCircle className="size-4 shrink-0 text-sm text-alert" />
          <span className="text-sm text-alert first-letter:uppercase">
            {error}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface FormControlProps extends React.HTMLProps<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormControl(props: FormControlProps) {
  return (
    <div {...props} className={cn("flex flex-col gap-2.5", props.className)} />
  );
}

interface LabelProps extends React.ComponentPropsWithRef<"label"> {
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}

export function Label({
  children,
  rightSlot,
  className,
  ...labelProps
}: LabelProps) {
  return (
    <label
      className={cn(
        "flex items-center gap-1 leading-none font-medium text-foreground",
        {
          "w-fit": !rightSlot,
        },
        className,
      )}
      {...labelProps}
    >
      {children}
      {rightSlot && (
        <span className="ml-auto text-sm font-light">{rightSlot}</span>
      )}
    </label>
  );
}

export const PasswordInput: React.FC<InputProps> = (props) => {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <Input
      {...props}
      type={passwordVisible ? "text" : "password"}
      rightSlot={
        <Button
          type="button"
          onClick={() => {
            setPasswordVisible(!passwordVisible);
          }}
          role="switch"
          aria-checked={passwordVisible}
          size="icon-sm"
          variant="secondary"
          aria-label="Show Password"
        >
          {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </Button>
      }
    />
  );
};
