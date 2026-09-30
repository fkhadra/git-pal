import { useQuery } from "@tanstack/react-query";
import {
  Columns2,
  Copy,
  Ellipsis,
  Rows2,
  SquareArrowOutUpRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import commands from "~/commands";
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
import { parseShortcut } from "~/libs/keymap";
import type { GetSavedReviewRequest } from "~/models/code-review";

import { useKeybind } from "./shortcuts";
import { store, useCodeReviewSnapshot } from "./store";

const EDITOR_KEY = "review:editor";

export function ReviewActionsMenu({
  review,
}: {
  review: GetSavedReviewRequest;
}) {
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon-sm" title="More actions">
            <Ellipsis className="size-4" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-52">
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
  );
}

function symbols(shortcut: string) {
  const { modifiers, mainKey } = parseShortcut(shortcut);

  return [...modifiers.map((m) => m.symbol), mainKey.symbol].join("");
}
