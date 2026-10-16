import { useState } from "react";
import { CodeBlock } from "../components/code-block";
import { SegmentedControl } from "../components/segmented-control";
import { WidgetFrame } from "../components/widget-frame";
import { applyResourceFilter, parsePatternInput } from "../lib/package-filter";

type ResourceType = "extensions" | "skills" | "prompts";
type Mode = "omit" | "empty" | "patterns";

const PACKAGE_RESOURCES: Record<ResourceType, string[]> = {
  extensions: ["extensions/git-tools.ts", "extensions/legacy.ts", "extensions/ui/status.ts"],
  skills: ["skills/pdf/SKILL.md", "skills/release/SKILL.md", "skills/experimental/draft/SKILL.md"],
  prompts: ["prompts/review.md", "prompts/commit.md", "prompts/translate.md"],
};

const INITIAL: Record<ResourceType, { mode: Mode; input: string }> = {
  extensions: { mode: "patterns", input: "extensions/*.ts, !extensions/legacy.ts" },
  skills: { mode: "omit", input: "" },
  prompts: { mode: "patterns", input: "prompts/review.md" },
};

const MODES: { value: Mode; label: string }[] = [
  { value: "omit", label: "省略" },
  { value: "empty", label: "[]" },
  { value: "patterns", label: "パターン" },
];

export function PackageFilterPlayground() {
  const [config, setConfig] = useState(INITIAL);
  const types = Object.keys(PACKAGE_RESOURCES) as ResourceType[];

  const entry: Record<string, unknown> = { source: "npm:@example/pi-tools" };
  for (const type of types) {
    const patterns = parsePatternInput(config[type].input, config[type].mode);
    if (patterns !== undefined) entry[type] = patterns;
  }

  return (
    <WidgetFrame
      title="パッケージ・フィルター・プレイグラウンド"
      description="settings.json の packages エントリーで、パッケージのどのリソースを読み込むかを絞り込みます。! は除外、+ は完全一致で強制追加、- は完全一致で強制除外です。"
    >
      <div className="widget-grid">
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          {types.map((type) => (
            <div key={type}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <strong className="mono">{type}</strong>
                <SegmentedControl
                  label={`${type} の指定方法`}
                  value={config[type].mode}
                  options={MODES}
                  onChange={(mode) => setConfig((c) => ({ ...c, [type]: { ...c[type], mode } }))}
                />
              </div>
              {config[type].mode === "patterns" && (
                <input
                  className="input mono"
                  style={{ marginTop: 6 }}
                  value={config[type].input}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, [type]: { ...c[type], input: e.target.value } }))
                  }
                  placeholder="カンマ区切り（例: skills/**, -skills/experimental/draft）"
                  aria-label={`${type} のパターン`}
                />
              )}
            </div>
          ))}
          <CodeBlock
            code={JSON.stringify({ packages: [entry] }, null, 2)}
            language="json"
            title="~/.pi/agent/settings.json"
          />
        </div>
        <div>
          <div className="panel-label">読み込まれるリソース</div>
          {types.map((type) => {
            const result = applyResourceFilter(
              PACKAGE_RESOURCES[type],
              parsePatternInput(config[type].input, config[type].mode),
            );
            return (
              <div key={type} style={{ marginBottom: 12 }}>
                <div className="mono" style={{ fontSize: 12, color: "var(--muted)" }}>
                  {type} — {result.enabled.length}/{PACKAGE_RESOURCES[type].length}
                </div>
                <ul className="context-list">
                  {PACKAGE_RESOURCES[type].map((path) => {
                    const on = result.enabled.includes(path);
                    return (
                      <li
                        key={path}
                        className="mono"
                        style={{
                          fontSize: 12.5,
                          borderLeftColor: on ? "var(--ok)" : "var(--line-strong)",
                          opacity: on ? 1 : 0.5,
                          textDecoration: on ? "none" : "line-through",
                        }}
                      >
                        {on ? "✓" : "✗"} {path}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="muted" style={{ fontSize: 13 }}>
            フィルターはパッケージ自身が宣言したリソースを狭めるだけで、宣言されていないものを公開することはできません。
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}
