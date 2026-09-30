import { ArrowRight, Eye, GitPullRequest, LayoutTemplate } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

import commands from "~/commands";
import { AgentAvatar } from "~/components/agent-avatar";
import { Spinner } from "~/components/spinner";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "~/components/ui/input-group";
import { TemplatePicker } from "~/features/templates/TemplatePicker";
import type { TemplateChoice } from "~/models/code-review";

import { useReviewMutation } from "./data-loader";
import { AUTO_TEMPLATE } from "./ReviewButton";
import { store } from "./store";
import { parsePrUrl } from "./utils";

const INVALID_URL =
  "Invalid PR URL. Use https://github.com/owner/repo/pull/123";

export function PrUrlInput() {
  const [value, setValue] = useState("");
  const [isViewing, setIsViewing] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { mutateAsync, isPending } = useReviewMutation();
  const parsed = parsePrUrl(value);
  const isBusy = isPending || isViewing;

  function target() {
    if (!parsed) {
      toast.error(INVALID_URL);
      return null;
    }

    return {
      owner: parsed.owner,
      repository: parsed.repo,
      prNumber: parsed.number,
    };
  }

  async function startReview(template: TemplateChoice) {
    const review = target();
    if (!review) return;

    try {
      await mutateAsync({ ...review, template });
      store.requestReview(review);
      setValue("");
    } catch (error) {
      toast.error(String(error));
    }
  }

  async function view() {
    const review = target();
    if (!review) return;

    setIsViewing(true);
    try {
      await commands.viewPullRequest(review);
      setValue("");
    } catch (error) {
      toast.error(String(error));
    } finally {
      setIsViewing(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startReview(AUTO_TEMPLATE);
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full items-center gap-2">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <GitPullRequest />
        </InputGroupAddon>
        <InputGroupInput
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste PR URL"
        />
      </InputGroup>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={menuButtonRef}
              type="button"
              variant="secondary"
              size="icon"
              title="Open pull request"
              disabled={!value.trim() || isBusy}
            >
              {isBusy ? <Spinner className="size-4" /> : <ArrowRight />}
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-52"
          finalFocus={!isPickerOpen}
        >
          <DropdownMenuItem onClick={view}>
            <Eye />
            View
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => startReview(AUTO_TEMPLATE)}>
            <AgentAvatar size={16} paused />
            Review
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPickerOpen(true)}>
            <LayoutTemplate />
            Review with template
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplatePicker
        owner={parsed?.owner}
        repository={parsed?.repo}
        prNumber={parsed?.number}
        open={isPickerOpen}
        onOpenChange={setPickerOpen}
        anchor={menuButtonRef}
        onSelect={startReview}
      />
    </form>
  );
}
