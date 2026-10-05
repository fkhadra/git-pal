import { Highlight, themes } from "prism-react-renderer";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

import { CopyButton } from "./copy-button";
import { ZoomableImage } from "./zoomable-image";

// GitHub flavored
const REMARK_PLUGINS = [remarkGfm];

const VIDEO_PATH = /\.(mp4|mov|webm|m4v)$/i;

function isVideo(href?: string) {
  if (!href) return false;

  try {
    return VIDEO_PATH.test(new URL(href).pathname);
  } catch {
    return false;
  }
}
const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize];

const LANGUAGE_CLASS = /language-(\w+)/;
const PLAIN_TEXT = "text";

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  const language = LANGUAGE_CLASS.exec(className ?? "")?.[1] ?? PLAIN_TEXT;
  const code = children.trimEnd();

  return (
    <Highlight theme={themes.oneDark} code={code} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <div className="my-2 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between bg-muted/50 py-1 pr-1.5 pl-3 text-xs text-muted-foreground">
            <span>{language}</span>
            <CopyButton
              content={code}
              message="Copy code"
              size="icon-xs"
              variant="ghost"
            />
          </div>
          <pre
            className="overflow-x-auto p-3 text-xs leading-relaxed"
            style={{ ...style, margin: 0 }}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        </div>
      )}
    </Highlight>
  );
}

export function MarkdownBody({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-code:before:content-none prose-code:after:content-none prose-pre:my-0 prose-pre:bg-transparent prose-pre:p-0 prose-ol:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 [&_summary]:cursor-pointer">
      <Markdown
        remarkPlugins={REMARK_PLUGINS}
        rehypePlugins={REHYPE_PLUGINS}
        components={{
          code({ className, children, ...props }) {
            // fenced blocks end with a newline, inline code never does
            const isBlock =
              LANGUAGE_CLASS.test(className ?? "") ||
              String(children).includes("\n");
            if (isBlock) {
              return (
                <CodeBlock className={className}>{String(children)}</CodeBlock>
              );
            }
            return (
              <code
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre({ children }) {
            return <>{children}</>;
          },
          table({ children }) {
            return (
              <div className="my-2 max-w-full overflow-x-auto">
                <table className="my-0">{children}</table>
              </div>
            );
          },
          h1({ children }) {
            return <h1 className="mt-4 mb-2 text-xl font-bold">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="mt-4 mb-2 text-lg font-bold">{children}</h2>;
          },
          h3({ children }) {
            return (
              <h3 className="mt-3 mb-1.5 text-base font-semibold">
                {children}
              </h3>
            );
          },
          a({ children, href }) {
            if (isVideo(href)) {
              return (
                <video
                  src={href}
                  controls
                  playsInline
                  className="my-2 max-h-96 max-w-full rounded"
                />
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {children}
              </a>
            );
          },
          img({ src, alt }) {
            return (
              <ZoomableImage
                src={typeof src === "string" ? src : undefined}
                alt={alt}
                className="my-0 inline max-w-full rounded"
              />
            );
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
