import { AgentAvatar } from "~/components/agent-avatar";
import { HARNESS_LABELS, useDefaultHarness } from "~/components/harness";
import { SlidingContent } from "~/components/sliding-content";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  ButtonGroup,
  ButtonGroupSeparator,
} from "~/components/ui/button-group";
import { TemplatePicker } from "~/features/templates/TemplatePicker";
import { useCssColor } from "~/libs/useCssColor";
import type { TemplateChoice } from "~/models/code-review";

export const AUTO_TEMPLATE: TemplateChoice = { type: "auto" };

// matches button variant color
const SEPARATOR_CLASS = {
  default: "bg-primary-foreground/25",
  secondary: "bg-secondary-foreground/15",
};

interface Props {
  owner?: string;
  repository?: string;
  prNumber?: number;
  variant?: "default" | "secondary";
  size?: "xs" | "sm";
  disabled?: boolean;
  isPending?: boolean;
  animated?: boolean;
  onReview: (template: TemplateChoice) => void;
}

export function ReviewButton({
  owner,
  repository,
  prNumber,
  variant = "secondary",
  size = "sm",
  disabled,
  isPending = false,
  animated = false,
  onReview,
}: Props) {
  const primaryInk = useCssColor("--primary-foreground");
  const harness = useDefaultHarness();
  const title = `Review with ${HARNESS_LABELS[harness]}`;
  const avatarColor = variant === "default" ? primaryInk : undefined;

  const label = (
    <>
      <AgentAvatar
        size={16}
        color={avatarColor}
        paused={!animated}
        state={animated ? "working" : "default"}
      />
      Review
    </>
  );

  return (
    <ButtonGroup>
      <Button
        type="button"
        variant={variant}
        size={size}
        title={title}
        disabled={disabled || isPending}
        className="relative overflow-hidden border-r-0"
        onClick={() => onReview(AUTO_TEMPLATE)}
      >
        <SlidingContent
          toggle={isPending}
          className="flex items-center gap-1.5"
          from={label}
          to={<Spinner className="size-4" />}
        />
      </Button>
      <ButtonGroupSeparator className={SEPARATOR_CLASS[variant]} />
      <TemplatePicker
        owner={owner}
        repository={repository}
        prNumber={prNumber}
        variant={variant}
        size={size}
        disabled={disabled || isPending}
        onSelect={onReview}
      />
    </ButtonGroup>
  );
}
