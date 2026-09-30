import { Highlight, themes } from "prism-react-renderer";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

// GitHub flavored
const REMARK_PLUGINS = [remarkGfm];
const REHYPE_PLUGINS = [rehypeRaw, rehypeSanitize];

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: string;
}) {
  const match = /language-(\w+)/.exec(className ?? "");
  const language = match ? match[1] : "";
  const code = children.trimEnd();

  if (!match) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
        {children}
      </code>
    );
  }

  return (
    <Highlight theme={themes.oneDark} code={code} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <div className="my-2 overflow-hidden rounded-lg border border-border">
          <div className="flex items-center justify-between bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <span>{language}</span>
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
            const isBlock = /language-/.test(className ?? "");
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
              <img
                src={src}
                alt={alt ?? ""}
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
