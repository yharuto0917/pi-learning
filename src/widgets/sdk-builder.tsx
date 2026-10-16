import { useState } from "react";
import { CodeBlock } from "../components/code-block";
import { SegmentedControl } from "../components/segmented-control";
import { WidgetFrame } from "../components/widget-frame";
import {
  CUSTOM_TOOL_NAME,
  defaultSdkOptions,
  generateSdkCode,
  isGuardAvailable,
  type ResourceMode,
  type SdkOptions,
  type SessionMode,
  type ToolPreset,
  toolPresets,
} from "../lib/sdk-codegen";

const RESOURCE_NOTES: Record<ResourceMode, string> = {
  default: "~/.pi/agent と cwd から AGENTS.md・スキル・拡張機能・テンプレートを通常どおり探索します。",
  "append-prompt": "DefaultResourceLoader の探索を使いつつ、システムプロンプトに方針を追記します。",
  "full-control":
    "探索を一切しない ResourceLoader を自前で渡します。プロンプトもリソースもホストが所有します。",
};

export function SdkBuilder() {
  const [options, setOptions] = useState<SdkOptions>(defaultSdkOptions);
  const set = (patch: Partial<SdkOptions>) => setOptions((o) => ({ ...o, ...patch }));
  const guardAvailable = isGuardAvailable(options);

  return (
    <WidgetFrame
      title="createAgentSession ビルダー"
      description="各境界（リソース・セッション・ツール）をどう差し替えるか選ぶと、ハーネスの雛形コードが生成されます。"
    >
      <div className="widget-grid lead-right">
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div>
            <div className="panel-label">リソースの探索（resourceLoader）</div>
            <SegmentedControl<ResourceMode>
              label="リソース"
              value={options.resources}
              options={[
                { value: "default", label: "既定" },
                { value: "append-prompt", label: "追記" },
                { value: "full-control", label: "完全制御" },
              ]}
              onChange={(resources) => set({ resources })}
            />
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0", lineHeight: 1.6 }}>
              {RESOURCE_NOTES[options.resources]}
            </p>
          </div>
          <div>
            <div className="panel-label">セッション（sessionManager）</div>
            <SegmentedControl<SessionMode>
              label="セッション"
              value={options.sessions}
              options={[
                { value: "persistent", label: "ファイルに保存" },
                { value: "memory", label: "inMemory" },
              ]}
              onChange={(sessions) => set({ sessions })}
            />
          </div>
          <div>
            <div className="panel-label">組み込みツール（tools）</div>
            <SegmentedControl<ToolPreset>
              label="ツール"
              value={options.tools}
              options={[
                { value: "default", label: "既定" },
                { value: "read-only", label: "読み取り専用" },
                { value: "none", label: "なし" },
              ]}
              onChange={(tools) => set({ tools })}
            />
            <p className="muted mono" style={{ fontSize: 12, margin: "6px 0 0" }}>
              {options.tools === "none"
                ? 'noTools: "builtin"（customTools は残る）'
                : `[${[...toolPresets[options.tools], ...(options.customTool && options.tools !== "default" ? [CUSTOM_TOOL_NAME] : [])].join(", ")}]`}
            </p>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={options.customTool}
              onChange={(e) => set({ customTool: e.target.checked })}
            />
            ハーネス固有のツールを追加（customTools）
          </label>
          <label className="check" style={{ opacity: guardAvailable ? 1 : 0.5 }}>
            <input
              type="checkbox"
              checked={options.guard && guardAvailable}
              disabled={!guardAvailable}
              onChange={(e) => set({ guard: e.target.checked })}
            />
            インライン拡張機能でツール呼び出しを検査
            {!guardAvailable && "（完全制御では拡張機能を読み込まない）"}
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={options.pickAvailableModel}
              onChange={(e) => set({ pickAvailableModel: e.target.checked })}
            />
            認証済みのモデルから明示的に選ぶ（ModelRuntime）
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={options.streaming}
              onChange={(e) => set({ streaming: e.target.checked })}
            />
            テキストをストリーミング出力する（subscribe）
          </label>
        </div>
        <div style={{ minWidth: 0 }}>
          <CodeBlock code={generateSdkCode(options)} language="ts" title="harness.ts" />
        </div>
      </div>
    </WidgetFrame>
  );
}
