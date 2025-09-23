import { cn } from "~/libs/utils";

type HeadProps = React.HTMLAttributes<HTMLHeadElement>;

export const Typography = {
  h1: ({ className, ...rest }: HeadProps) => (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-extrabold tracking-tight text-balance",
        className,
      )}
      {...rest}
    />
  ),
  h2: ({ className, ...rest }: HeadProps) => (
    <h2
      className={cn(
        "scroll-m-20 pb-2 text-3xl font-semibold tracking-tight first:mt-0",
        className,
      )}
      {...rest}
    />
  ),
  h3: ({ className, ...rest }: HeadProps) => (
    <h3
      className={cn(
        "scroll-m-20 text-2xl font-semibold tracking-tight",
        className,
      )}
      {...rest}
    />
  ),
  h4: ({ className, ...rest }: HeadProps) => (
    <h4
      className={cn(
        "scroll-m-20 text-xl font-semibold tracking-tight",
        className,
      )}
      {...rest}
    />
  ),
  p: ({ className, ...rest }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("leading-7", className)} {...rest} />
  ),
};
