import { useState } from "react";
import { CodeBlock } from "../components/code-block";
import { WidgetFrame } from "../components/widget-frame";
import { defaultExtensionOptions, type ExtensionOptions, generateExtension } from "../lib/extension-codegen";

type BoolKey = "tool" | "command" | "guard" | "status" | "systemPrompt" | "lifecycle";

const FEATURES: { key: BoolKey; label: string; detail: string }[] = [
  { key: "tool", label: "カスタムツール", detail: "モデルが呼び出せる操作を追加（registerTool）" },
  {
    key: "command",
    label: "スラッシュコマンド",
    detail: "ユーザーが / で実行するコマンド（registerCommand）",
  },
  { key: "guard", label: "危険なコマンドの確認", detail: "bash の実行前に検査してブロック（tool_call）" },
  { key: "status", label: "フッターのステータス", detail: "ターンの進行を表示（turn_start / turn_end）" },
  {
    key: "systemPrompt",
    label: "システムプロンプトの追記",
    detail: "実行ごとに指示を足す（before_agent_start）",
  },
  {
    key: "lifecycle",
    label: "リソースの開始と片付け",
    detail: "タイマーなどを安全に扱う（session_start / session_shutdown）",
  },
];

export function ExtensionBuilder() {
  const [options, setOptions] = useState<ExtensionOptions>(defaultExtensionOptions);
  const { code, apis } = generateExtension(options);
  const set = (patch: Partial<ExtensionOptions>) => setOptions((o) => ({ ...o, ...patch }));

  return (
    <WidgetFrame
      title="拡張機能ビルダー"
      description="欲しい機能にチェックを入れると、ExtensionAPI を使ったコードが組み上がります。~/.pi/agent/extensions/my-extension.ts に保存して /reload すれば動きます。"
    >
      <div className="widget-grid lead-right">
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          {FEATURES.map((f) => (
            <div key={f.key}>
              <label className="check">
                <input
                  type="checkbox"
                  checked={options[f.key]}
                  onChange={(e) => set({ [f.key]: e.target.checked })}
                />
                <span>
                  <strong>{f.label}</strong>
                  <br />
                  <span className="muted" style={{ fontSize: 13 }}>
                    {f.detail}
                  </span>
                </span>
              </label>
              {f.key === "tool" && options.tool && (
                <input
                  className="input mono"
                  style={{ marginTop: 6 }}
                  value={options.toolName}
                  onChange={(e) => set({ toolName: e.target.value })}
                  aria-label="ツール名"
                />
              )}
              {f.key === "command" && options.command && (
                <input
                  className="input mono"
                  style={{ marginTop: 6 }}
                  value={options.commandName}
                  onChange={(e) => set({ commandName: e.target.value })}
                  aria-label="コマンド名"
                />
              )}
              {f.key === "systemPrompt" && options.systemPrompt && (
                <input
                  className="input"
                  style={{ marginTop: 6 }}
                  value={options.systemPromptText}
                  onChange={(e) => set({ systemPromptText: e.target.value })}
                  aria-label="追記する指示"
                />
              )}
            </div>
          ))}
          <div>
            <div className="panel-label">使っている API</div>
            <div className="arg-list">
              {apis.length === 0 ? (
                <span className="muted">（なし）</span>
              ) : (
                apis.map((api) => (
                  <span key={api} className="chip">
                    {api}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <CodeBlock code={code} language="ts" title="~/.pi/agent/extensions/my-extension.ts" />
          <p className="muted" style={{ fontSize: 13 }}>
            試すだけなら <code>pi --extension ./my-extension.ts</code>。Pi は jiti で読み込むので TypeScript
            のビルドは不要です。
          </p>
        </div>
      </div>
    </WidgetFrame>
  );
}
