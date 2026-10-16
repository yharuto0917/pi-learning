// settings.json の packages エントリーにおけるリソースフィルター（packages/coding-agent/src/core/package-manager.ts の applyPatterns 準拠）

/** `*` と `?` と `**` を扱う簡易グロブ。パス区切りは `/`。 */
export function globToRegExp(pattern: string): RegExp {
  let source = "";
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];
    if (char === "*") {
      if (pattern[i + 1] === "*") {
        source += ".*";
        i++;
        if (pattern[i + 1] === "/") i++;
      } else {
        source += "[^/]*";
      }
    } else if (char === "?") {
      source += "[^/]";
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`^${source}$`);
}

function matchesAny(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => globToRegExp(pattern).test(path) || path.startsWith(`${pattern}/`));
}

/** SKILL.md は親ディレクトリ名でも完全一致とみなす */
function matchesExact(path: string, patterns: string[]): boolean {
  const parent = path.endsWith("/SKILL.md") ? path.slice(0, -"/SKILL.md".length) : undefined;
  return patterns.some((pattern) => pattern === path || (parent !== undefined && pattern === parent));
}

export interface FilterResult {
  enabled: string[];
  disabled: string[];
}

/**
 * フィルターを適用する。
 * - undefined（プロパティ省略）: すべて読み込む
 * - []: 何も読み込まない
 * - 通常のパターン: 一致したものだけを含める
 * - `!pattern`: 一致したものを除外
 * - `+path`: 完全一致で強制的に含める（除外より優先）
 * - `-path`: 完全一致で強制的に除外（強制インクルードより優先）
 */
export function applyResourceFilter(allPaths: string[], patterns: string[] | undefined): FilterResult {
  if (patterns === undefined) return { enabled: [...allPaths], disabled: [] };

  const includes: string[] = [];
  const excludes: string[] = [];
  const forceIncludes: string[] = [];
  const forceExcludes: string[] = [];

  for (const p of patterns) {
    if (p.startsWith("+")) forceIncludes.push(p.slice(1));
    else if (p.startsWith("-")) forceExcludes.push(p.slice(1));
    else if (p.startsWith("!")) excludes.push(p.slice(1));
    else includes.push(p);
  }

  // パターンが1つもない空配列は「何も読み込まない」
  let result =
    patterns.length === 0
      ? []
      : includes.length === 0
        ? [...allPaths]
        : allPaths.filter((path) => matchesAny(path, includes));

  if (excludes.length > 0) result = result.filter((path) => !matchesAny(path, excludes));

  for (const path of allPaths) {
    if (!result.includes(path) && matchesExact(path, forceIncludes)) result.push(path);
  }

  if (forceExcludes.length > 0) result = result.filter((path) => !matchesExact(path, forceExcludes));

  const enabledSet = new Set(result);
  return {
    enabled: allPaths.filter((path) => enabledSet.has(path)),
    disabled: allPaths.filter((path) => !enabledSet.has(path)),
  };
}

/** カンマや改行で区切られた入力をパターン配列にする。空入力は undefined（省略）として扱う。 */
export function parsePatternInput(input: string, mode: "omit" | "empty" | "patterns"): string[] | undefined {
  if (mode === "omit") return undefined;
  if (mode === "empty") return [];
  return input
    .split(/[\n,]/)
    .map((p) => p.trim().replace(/^["']|["']$/g, ""))
    .filter((p) => p.length > 0);
}
