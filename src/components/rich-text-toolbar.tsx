import { type Editor, useEditorState } from "@tiptap/react";
import { cn } from "cn";
import {
  Bold,
  Code,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  SquareCode,
  Strikethrough,
} from "lucide-react";
import { useState } from "react";

import { ShortcutTooltip } from "~/components/shortcut-tooltip";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

const ACTIVE_CLASS =
  "bg-primary/20 text-primary hover:bg-primary/25 hover:text-primary";

function ToolbarButton({
  label,
  shortcut,
  active,
  onClick,
  children,
}: {
  label: string;
  /** Tiptap's own binding, shown in the tooltip */
  shortcut: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <ShortcutTooltip label={label} shortcut={shortcut}>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={label}
        aria-pressed={active}
        className={cn(active && ACTIVE_CLASS)}
        onClick={onClick}
      >
        {children}
      </Button>
    </ShortcutTooltip>
  );
}

function LinkButton({ editor, active }: { editor: Editor; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [href, setHref] = useState("");

  const apply = () => {
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href.trim()) chain.setLink({ href: href.trim() }).run();
    else chain.unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) setHref(editor.getAttributes("link").href ?? "");
        setOpen(next);
      }}
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Link"
                  aria-pressed={active}
                  className={cn(active && ACTIVE_CLASS)}
                >
                  <Link />
                </Button>
              }
            />
          }
        />
        <TooltipContent>Link</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" className="w-72 p-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <Input
            autoFocus
            value={href}
            placeholder="https://… (empty removes the link)"
            onChange={(e) => setHref(e.target.value)}
          />
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function RichTextToolbar({ editor }: { editor: Editor }) {
  const state = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      link: editor.isActive("link"),
      bulletList: editor.isActive("bulletList"),
      orderedList: editor.isActive("orderedList"),
      blockquote: editor.isActive("blockquote"),
      codeBlock: editor.isActive("codeBlock"),
    }),
  });

  const run = () => editor.chain().focus();

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <ToolbarButton
        label="Bold"
        shortcut="cmd+B"
        active={state.bold}
        onClick={() => run().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut="cmd+I"
        active={state.italic}
        onClick={() => run().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        shortcut="shift+cmd+S"
        active={state.strike}
        onClick={() => run().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>
      <LinkButton editor={editor} active={state.link} />
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Inline code"
        shortcut="cmd+E"
        active={state.code}
        onClick={() => run().toggleCode().run()}
      >
        <Code />
      </ToolbarButton>
      <ToolbarButton
        label="Code block"
        shortcut="cmd+alt+C"
        active={state.codeBlock}
        onClick={() => run().toggleCodeBlock().run()}
      >
        <SquareCode />
      </ToolbarButton>
      <span className="mx-1 h-4 w-px bg-border" />
      <ToolbarButton
        label="Bullet list"
        shortcut="shift+cmd+8"
        active={state.bulletList}
        onClick={() => run().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        shortcut="shift+cmd+7"
        active={state.orderedList}
        onClick={() => run().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        label="Quote"
        shortcut="shift+cmd+B"
        active={state.blockquote}
        onClick={() => run().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>
    </div>
  );
}
