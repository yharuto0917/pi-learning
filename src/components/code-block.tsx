import { Highlight, themes } from "prism-react-renderer";
import { useState } from "react";

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

const HIGHLIGHTED = new Set([
  "ts",
  "tsx",
  "typescript",
  "js",
  "javascript",
  "json",
  "markdown",
  "md",
  "python",
  "yaml",
]);

export function CodeBlock({ code, language = "ts", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const text = code.replace(/\n$/, "");
  const prismLanguage = HIGHLIGHTED.has(language) ? (language === "ts" ? "tsx" : language) : "text";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{title ?? language}</span>
        <button type="button" className="code-copy" onClick={copy}>
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
      <Highlight theme={themes.oneDark} code={text} language={prismLanguage}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre style={{ background: "transparent" }}>
            {tokens.map((line, i) => {
              const { key: _lineKey, ...lineProps } = getLineProps({ line, key: i });
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: 行は順序固定で並べ替えない
                <div key={i} {...lineProps}>
                  {line.map((token, j) => {
                    const { key: _tokenKey, ...tokenProps } = getTokenProps({ token, key: j });
                    // biome-ignore lint/suspicious/noArrayIndexKey: トークンは順序固定で並べ替えない
                    return <span key={j} {...tokenProps} />;
                  })}
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
