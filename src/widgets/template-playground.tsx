import { useState } from "react";
import { WidgetFrame } from "../components/widget-frame";
import { expandTemplate } from "../lib/template-expander";

const PRESETS = [
  {
    name: "review",
    source: `---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes. Focus on \${1:-correctness, security, and error handling}.`,
    args: '"API compatibility"',
  },
  {
    name: "translate",
    source: `---
description: 指定した言語に翻訳する
argument-hint: "<lang> <files...>"
---
次のファイルを $1 に翻訳してください: \${@:2}
用語集があれば守ってください。`,
    args: "英語 README.md docs/guide.md",
  },
  {
    name: "pick",
    source: `---
description: 引数スライスの練習
---
全部: $@
2番目から2つ: \${@:2:2}
5番目: [$5]
既定値付き: \${4:-（4番目はありません）}`,
    args: "a b c",
  },
];

export function TemplatePlayground() {
  const [name, setName] = useState(PRESETS[0].name);
  const [source, setSource] = useState(PRESETS[0].source);
  const [args, setArgs] = useState(PRESETS[0].args);
  const result = expandTemplate(source, args);
  const command = name.trim() || "template";

  return (
    <WidgetFrame
      title="テンプレート展開プレイグラウンド"
      description="左でテンプレートを編集し、引数を入れると、Pi と同じルールで展開された結果が右に表示されます。"
    >
      <div className="example-row" style={{ marginTop: 0, marginBottom: 12 }}>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className="btn small"
            onClick={() => {
              setName(p.name);
              setSource(p.source);
              setArgs(p.args);
            }}
          >
            例: {p.name}.md
          </button>
        ))}
      </div>
      <div className="widget-grid">
        <div style={{ display: "grid", gap: 10 }}>
          <label className="field">
            <span>ファイル名（= コマンド名）</span>
            <input
              className="input mono"
              value={name}
              onChange={(e) => setName(e.target.value.replace(/\s/g, ""))}
            />
          </label>
          <label className="field">
            <span>~/.pi/agent/prompts/{command}.md</span>
            <textarea
              className="textarea"
              rows={9}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
            />
          </label>
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <label className="field">
            <span>エディターでの入力</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <code style={{ whiteSpace: "nowrap" }}>/{command}</code>
              <input
                className="input mono"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                placeholder={result.argumentHint || "引数"}
              />
            </div>
          </label>
          <div>
            <div className="panel-label">コマンド補完での表示</div>
            <div className="output-box" style={{ minHeight: 0 }}>
              /{command} {result.argumentHint && <span className="muted">{result.argumentHint}</span>} —{" "}
              {result.description || "（説明なし）"}
            </div>
          </div>
          <div>
            <div className="panel-label">解析された引数</div>
            <div className="arg-list">
              {result.args.length === 0 && <span className="muted">（引数なし）</span>}
              {result.args.map((arg, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: 引数は位置で識別する
                <span key={i} className="chip">
                  ${i + 1} = {arg === "" ? '""' : arg}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="panel-label">エージェントに渡るメッセージ</div>
            <div className="output-box" aria-live="polite">
              {result.output.trim() || "（空）"}
            </div>
          </div>
        </div>
      </div>
    </WidgetFrame>
  );
}
