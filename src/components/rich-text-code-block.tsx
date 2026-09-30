import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import {
  NodeViewContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type ReactNodeViewProps,
} from "@tiptap/react";
import { common, createLowlight } from "lowlight";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const lowlight = createLowlight(common);
const LANGUAGES = lowlight.listLanguages().sort();

/** Select value for a block without language, highlighted by auto detection */
const AUTO = "auto";

function CodeBlockView({ node, updateAttributes }: ReactNodeViewProps) {
  const language: string = node.attrs.language ?? AUTO;

  return (
    <NodeViewWrapper className="relative">
      <div contentEditable={false} className="absolute top-1.5 right-1.5">
        <Select
          value={language}
          onValueChange={(value) =>
            updateAttributes({ language: value === AUTO ? null : value })
          }
        >
          <SelectTrigger
            size="sm"
            className="h-6 gap-1 border-none bg-transparent px-2 text-xs text-muted-foreground shadow-none"
          >
            <SelectValue>{language}</SelectValue>
          </SelectTrigger>
          <SelectContent align="end" className="max-h-64">
            <SelectItem value={AUTO}>auto</SelectItem>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <pre>
        <NodeViewContent<"code"> as="code" />
      </pre>
    </NodeViewWrapper>
  );
}

/** Highlighted code block with a language picker. */
export const CodeBlock = CodeBlockLowlight.extend({
  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
}).configure({ lowlight });
