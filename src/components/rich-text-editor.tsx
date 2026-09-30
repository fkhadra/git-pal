import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { cn } from "cn";
import { useLayoutEffect, useRef } from "react";

import { CodeBlock } from "./rich-text-code-block";
import { EmojiExtension, isSuggestingEmoji } from "./rich-text-emoji";
import { RichTextToolbar } from "./rich-text-toolbar";

import "./rich-text-editor.css";

interface Props {
  defaultValue?: string;
  placeholder?: string;
  autoFocus?: boolean;
  toolbar?: boolean;
  className?: string;
  onChange?: (markdown: string) => void;
  /** Cmd+Enter */
  onSubmit?: () => void;
  onCancel?: () => void;
}

export function RichTextEditor({
  defaultValue = "",
  placeholder,
  autoFocus,
  toolbar = true,
  className,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const handlers = useRef({ onChange, onSubmit, onCancel });

  useLayoutEffect(() => {
    handlers.current = { onChange, onSubmit, onCancel };
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { openOnClick: false },
      }),
      CodeBlock,
      EmojiExtension,
      Markdown,
      Placeholder.configure({ placeholder }),
    ],
    content: defaultValue,
    contentType: "markdown",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-code:before:content-none prose-code:after:content-none",
      },
      handleKeyDown: (view, event) => {
        const { onSubmit, onCancel } = handlers.current;
        if (isSuggestingEmoji(view.state)) return false;

        if (event.key === "Enter" && event.metaKey && onSubmit) {
          onSubmit();
          return true;
        }

        if (event.key === "Escape" && onCancel) {
          onCancel();
          return true;
        }

        return false;
      },
    },
    onUpdate: ({ editor }) => handlers.current.onChange?.(editor.getMarkdown()),
  });

  return (
    <div className="flex flex-col gap-1.5">
      {toolbar && editor && <RichTextToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className={cn("rich-text-editor cursor-text", className)}
        onClick={() => editor?.commands.focus()}
      />
    </div>
  );
}
