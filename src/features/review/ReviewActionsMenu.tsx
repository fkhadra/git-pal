import { useQuery } from "@tanstack/react-query";
import {
  Columns2,
  Copy,
  Ellipsis,
  LayoutTemplate,
  RotateCcw,
  Rows2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";

import commands from "~/commands";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { TemplatePicker } from "~/features/templates/TemplatePicker";
import { parseShortcut } from "~/libs/keymap";
import type {
  CodeReview,
  GetSavedReviewRequest,
  TemplateChoice,
} from "~/models/code-review";

import { AUTO_TEMPLATE } from "./ReviewButton";
import { useRestartReview } from "./ReviewJobActions";
import { useKeybind } from "./shortcuts";
import { store, useCodeReviewSnapshot } from "./store";

const EDITOR_KEY = "review:editor";

// a full review keeps the user notes only
function replacedCount(review?: CodeReview) {
  return (
    review?.comments.filter((c) => c.severity !== "user" && !c.posted).length ??
    0
  );
}

export function ReviewActionsMenu({
  review,
  savedReview,
  isReviewing,
}: {
  review: GetSavedReviewRequest;
  savedReview?: CodeReview;
  isReviewing: boolean;
}) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateChoice | null>(
    null,
  );
  const { restart } = useRestartReview(review);
  const canReviewAgain = !!savedReview?.reviewed && !isReviewing;
  const replaced = replacedCount(savedReview);
  const [lastEditor, setLastEditor] = useState(() =>
    localStorage.getItem(EDITOR_KEY),
  );
  const snapshot = useCodeReviewSnapshot();
  const keybind = useKeybind();
  const editors = useQuery({
    queryKey: ["editors"],
    queryFn: commands.listEditors,
    staleTime: Infinity,
  }).data;

  const request = {
    owner: review.owner,
    repository: review.repository,
    prNumber: review.prNumber,
  };
  const defaultEditor = editors?.find((e) => e === lastEditor) ?? editors?.[0];

  const openWith = (editor: string) => {
    localStorage.setItem(EDITOR_KEY, editor);
    setLastEditor(editor);
    commands
      .openInEditor(request, editor)
      .catch((error) => toast.error(String(error)));
  };

  const reviewAgain = (template: TemplateChoice) => {
    if (replaced > 0) {
      setPendingTemplate(template);
      return;
    }

    restart(template);
  };

  const confirmReviewAgain = () => {
    if (pendingTemplate) restart(pendingTemplate);
    setPendingTemplate(null);
  };

  const copyPath = async () => {
    const path = commands
      .worktreePath(request)
      .then((p) => new Blob([p], { type: "text/plain" }));

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": path }),
      ]);
      toast.success("Path copied");
    } catch (error) {
      toast.error(String(error));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              ref={menuButtonRef}
              variant="ghost"
              size="icon-sm"
              title="More actions"
            >
              <Ellipsis className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent
          align="end"
          className="w-60"
          finalFocus={!isPickerOpen}
        >
          {canReviewAgain && (
            <>
              <DropdownMenuItem onClick={() => reviewAgain(AUTO_TEMPLATE)}>
                <RotateCcw />
                Review again
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPickerOpen(true)}>
                <LayoutTemplate />
                Review again with template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={store.toggleViewType}>
            {snapshot.viewType === "unified" ? <Columns2 /> : <Rows2 />}
            {snapshot.viewType === "unified" ? "Split view" : "Unified view"}
            <DropdownMenuShortcut>
              {symbols(keybind.toggleViewType)}
            </DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {defaultEditor && (
            <>
              <DropdownMenuItem onClick={() => openWith(defaultEditor)}>
                <SquareArrowOutUpRight />
                Open in {defaultEditor}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger inset>Open with</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {editors?.map((editor) => (
                    <DropdownMenuItem
                      key={editor}
                      onClick={() => openWith(editor)}
                    >
                      {editor}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={copyPath}>
            <Copy />
            Copy path
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplatePicker
        owner={review.owner}
        repository={review.repository}
        prNumber={review.prNumber}
        open={isPickerOpen}
        onOpenChange={setPickerOpen}
        anchor={menuButtonRef}
        onSelect={reviewAgain}
      />

      <AlertDialog
        open={!!pendingTemplate}
        onOpenChange={(open) => {
          if (!open) setPendingTemplate(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Review again</AlertDialogTitle>
            <AlertDialogDescription>
              {replaced} AI comment{replaced === 1 ? "" : "s"} not posted yet
              will be replaced. Your notes are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReviewAgain}>
              Review again
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function symbols(shortcut: string) {
  const { modifiers, mainKey } = parseShortcut(shortcut);

  return [...modifiers.map((m) => m.symbol), mainKey.symbol].join("");
}
