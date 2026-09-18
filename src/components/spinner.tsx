import { cn } from "cn";

export interface SpinnerProps extends React.ComponentPropsWithRef<"svg"> {
  showCenter?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  className,
  showCenter,
  ...rest
}) => {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      viewBox="0 0 16 16"
      className={cn("size-6 animate-spin fill-white stroke-white", className)}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      <path
        className="fill-none"
        strokeWidth="2"
        d="M3.05 3.05a7 7 0 1 1 9.9 9.9 7 7 0 0 1-9.9-9.9Z"
        opacity=".5"
      />
      {showCenter && (
        <path
          className="stroke-none"
          fillRule="evenodd"
          d="M8 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
          clipRule="evenodd"
        />
      )}
      <path
        className="stroke-none"
        d="M14 8a6 6 0 0 0-6-6V0a8 8 0 0 1 8 8h-2Z"
      />
    </svg>
  );
};
