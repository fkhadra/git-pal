import { cn } from "cn";
import {
  GitPullRequest,
  GitPullRequestDraft,
  OctagonAlert,
} from "lucide-react";

import { Spinner } from "~/components/spinner";

function Building({ className, ...rest }: React.ComponentPropsWithRef<"svg">) {
  return (
    <Spinner
      aria-label="Pull request building"
      className={cn("fill-yellow-300 stroke-yellow-300", className)}
      showCenter
      {...rest}
    />
  );
}

function Draft(props: React.ComponentPropsWithRef<"svg">) {
  return <GitPullRequestDraft aria-label="Pull request in draft" {...props} />;
}

function Failed({ className, ...rest }: React.ComponentPropsWithRef<"svg">) {
  return (
    <GitPullRequest
      aria-label="Pull request failed"
      className={cn("text-alert", className)}
      {...rest}
    />
  );
}

function ChangesRequested({
  className,
  ...rest
}: React.ComponentPropsWithRef<"svg">) {
  return (
    <GitPullRequest
      aria-label="Pull request changes requested"
      className={cn("text-warning", className)}
      {...rest}
    />
  );
}

function Conflict({ className, ...rest }: React.ComponentPropsWithRef<"svg">) {
  return (
    <OctagonAlert
      aria-label="Pull request has merge conflicts"
      className={cn("text-warning", className)}
      {...rest}
    />
  );
}

function Ready({ className, ...rest }: React.ComponentPropsWithRef<"svg">) {
  return (
    <GitPullRequest
      aria-label="Pull request is ready for review"
      className={cn("text-success", className)}
      {...rest}
    />
  );
}

function Merged({ className, ...rest }: React.ComponentPropsWithRef<"svg">) {
  return (
    <GitPullRequest
      aria-label="Pull request has been merged"
      className={cn("text-purple-500", className)}
      {...rest}
    />
  );
}

export const PullRequestStatusIcon = {
  Building,
  Draft,
  Failed,
  ChangesRequested,
  Conflict,
  Ready,
  Merged,
};
