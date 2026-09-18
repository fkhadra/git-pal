import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "cn";
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
    `caret-primary ring-primary/50 text-foreground placeholder:text-muted-foreground border
    border-primary/10 disabled:text-opacity-90 bg-background dark:bg-input flex items-center h-10 w-full
    rounded-lg border-1 px-3 py-2 transition-colors file:border-0
    file:bg-transparent shadow file:text-sm file:font-medium
    focus-visible:outline-hidden disabled:cursor-not-allowed disabled:border-none
     disabled:opacity-50 focus-visible:shadow-primary
    focus-visible:shadow-[0_0_4px_1px] transition-shadow hover:ring-primary/70
    disabled:bg-input/50 dark:disabled:bg-input/80
    hover:ring-1`,
    !!error &&
      `focus-visible:shadow-alert caret-alert ring-1 ring-alert hover:ring-alert
      disabled:border-2 disabled:border-solid`,
  );

  return (
    <div className={wrapperClassName}>
      {hasSlot ? (
        <div
          className={cn(
            baseStyle,
            `has-[input:focus-visible]:shadow-primary has-[input:focus-visible]:shadow-[0_0_4px_1px]`,
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
          <AlertCircle className="text-alert size-4 shrink-0 text-sm" />
          <span className="text-alert text-sm first-letter:uppercase">
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
        "text-foreground flex items-center gap-1 leading-none font-medium",
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
