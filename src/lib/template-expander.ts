// Pi のプロンプトテンプレート展開を再現する（packages/coding-agent/src/core/prompt-templates.ts 準拠）

export interface ParsedTemplate {
  frontmatter: Record<string, string>;
  body: string;
}

export interface ExpandResult {
  args: string[];
  description: string;
  argumentHint: string;
  output: string;
}

/** シェル風のクォートを解釈して引数を分割する。空のクォート ("") も1つの引数として残す。 */
export function parseCommandArgs(argsString: string): string[] {
  const args: string[] = [];
  let current = "";
  let hasToken = false;
  let inQuote: string | null = null;

  for (const char of argsString) {
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      } else {
        current += char;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
      hasToken = true;
    } else if (/\s/.test(char)) {
      if (hasToken) {
        args.push(current);
        current = "";
        hasToken = false;
      }
    } else {
      current += char;
      hasToken = true;
    }
  }

  if (hasToken) args.push(current);
  return args;
}

/** プレースホルダーを置換する。置換後の値は再帰的に展開しない。 */
export function substituteArgs(content: string, args: string[]): string {
  const allArgs = args.join(" ");

  return content.replace(
    /\$\{(\d+|ARGUMENTS|@):-([^}]*)\}|\$\{@:(\d+)(?::(\d+))?\}|\$(ARGUMENTS|@|\d+)/g,
    (_match, defaultTarget, defaultValue, sliceStart, sliceLength, simple) => {
      if (defaultTarget) {
        const value =
          defaultTarget === "@" || defaultTarget === "ARGUMENTS"
            ? allArgs
            : args[Number.parseInt(defaultTarget, 10) - 1];
        return value ? value : defaultValue;
      }

      if (sliceStart) {
        // 利用者は 1 始まりで指定する。0 は bash と同じく 1 として扱う
        const start = Math.max(0, Number.parseInt(sliceStart, 10) - 1);
        if (sliceLength) {
          return args.slice(start, start + Number.parseInt(sliceLength, 10)).join(" ");
        }
        return args.slice(start).join(" ");
      }

      if (simple === "ARGUMENTS" || simple === "@") return allArgs;
      return args[Number.parseInt(simple, 10) - 1] ?? "";
    },
  );
}

/** 単純な key: value 形式の YAML フロントマターを読む（学習用の簡易パーサー）。 */
export function parseFrontmatter(raw: string): ParsedTemplate {
  const normalized = raw.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(normalized);
  if (!match) return { frontmatter: {}, body: normalized };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    frontmatter[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, "$2");
  }
  return { frontmatter, body: match[2] };
}

/** `/review "API 互換性"` のような入力全体を受け取り、テンプレートを展開する。 */
export function expandTemplate(templateSource: string, argsString: string): ExpandResult {
  const { frontmatter, body } = parseFrontmatter(templateSource);
  const args = parseCommandArgs(argsString);

  let description = frontmatter.description ?? "";
  if (!description) {
    const firstLine = body.split("\n").find((line) => line.trim()) ?? "";
    description = firstLine.length > 60 ? `${firstLine.slice(0, 60)}...` : firstLine;
  }

  return {
    args,
    description,
    argumentHint: frontmatter["argument-hint"] ?? "",
    output: substituteArgs(body, args),
  };
}
