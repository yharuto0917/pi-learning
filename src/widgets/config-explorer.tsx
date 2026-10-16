import { useState } from "react";
import { CodeBlock } from "../components/code-block";
import { WidgetFrame } from "../components/widget-frame";

interface ConfigItem {
  path: string;
  group: "agent" | "project" | "context";
  summary: string;
  trust: "不要" | "必要" | "—";
  example?: { code: string; language: string };
}

const items: ConfigItem[] = [
  {
    path: "settings.json",
    group: "agent",
    summary: "ユーザー設定。既定モデル、思考レベル、既定ツール、テーマ、リソースのパス、パッケージ宣言など。",
    trust: "—",
    example: {
      code: `{\n  "theme": "light/dark",\n  "defaultTools": ["+grep", "+find"],\n  "packages": ["npm:@example/pi-tools@1.0.0"]\n}`,
      language: "json",
    },
  },
  {
    path: "AGENTS.md",
    group: "agent",
    summary: "どの作業ディレクトリでも適用される個人の指示。CLAUDE.md や AGENTS.override.md も読み込まれる。",
    trust: "—",
    example: {
      code: "# 個人の方針\n- 回答は日本語で\n- コミットメッセージは Conventional Commits",
      language: "markdown",
    },
  },
  {
    path: "SYSTEM.md / APPEND_SYSTEM.md",
    group: "agent",
    summary: "SYSTEM.md は既定のシステムプロンプトを置き換え、APPEND_SYSTEM.md は追記する。",
    trust: "—",
  },
  {
    path: "models.json",
    group: "agent",
    summary: "互換エンドポイント・モデルの追加と、既存モデルのメタデータ上書き（modelOverrides）。",
    trust: "—",
    example: {
      code: `{\n  "providers": {\n    "ollama": {\n      "baseUrl": "http://localhost:11434/v1",\n      "api": "openai-completions",\n      "apiKey": "ollama",\n      "models": [{ "id": "qwen2.5-coder:7b" }]\n    }\n  }\n}`,
      language: "json",
    },
  },
  {
    path: "auth.json",
    group: "agent",
    summary: "/login で保存した API キーと OAuth 認証情報。共有しない。",
    trust: "—",
  },
  {
    path: "keybindings.json",
    group: "agent",
    summary: "ターミナル UI とアプリのキーバインドの変更。",
    trust: "—",
  },
  { path: "mcp.json", group: "agent", summary: "すべてのプロジェクトで使える MCP サーバー。", trust: "—" },
  {
    path: "extensions/ skills/ prompts/ themes/",
    group: "agent",
    summary: "個人の拡張機能・スキル・プロンプトテンプレート・テーマの置き場所。",
    trust: "—",
  },
  {
    path: ".pi/settings.json",
    group: "project",
    summary:
      "プロジェクト設定。ユーザー設定の上に重なる。パッケージを pi install -l で宣言するとここに書かれる。",
    trust: "必要",
  },
  {
    path: ".pi/SYSTEM.md / .pi/APPEND_SYSTEM.md",
    group: "project",
    summary:
      "プロジェクト用のシステムプロンプトの置き換え／追記。信頼済みならエージェントディレクトリの同名ファイルより優先（結合はされない）。",
    trust: "必要",
  },
  { path: ".pi/mcp.json", group: "project", summary: "プロジェクトの MCP サーバー。", trust: "必要" },
  {
    path: ".pi/extensions/ skills/ prompts/ themes/",
    group: "project",
    summary: "プロジェクト固有のリソース。チームで共有するならリポジトリにコミットする。",
    trust: "必要",
  },
  {
    path: "AGENTS.md（作業ディレクトリと親）",
    group: "context",
    summary:
      "作業ディレクトリとその親ディレクトリから探索される。そのディレクトリ以下で Pi が動くとき常に適用。",
    trust: "不要",
    example: {
      code: "# このリポジトリのルール\n- テストは npm test で実行する\n- src/generated/ は手で編集しない\n- 変更前に必ず計画を示す",
      language: "markdown",
    },
  },
  {
    path: "AGENTS.override.md",
    group: "context",
    summary:
      "同じディレクトリの AGENTS.md / CLAUDE.md だけを置き換える。他のディレクトリのものは抑制しない。",
    trust: "不要",
  },
];

const GROUPS = [
  { id: "agent", label: "~/.pi/agent/（ユーザー）" },
  { id: "project", label: "<project>/.pi/（プロジェクト）" },
  { id: "context", label: "コンテキストファイル" },
] as const;

export function ConfigExplorer() {
  const [selected, setSelected] = useState(items[0].path);
  const item = items.find((i) => i.path === selected) ?? items[0];

  return (
    <WidgetFrame
      title="設定ファイル・エクスプローラー"
      description="ファイルを選ぶと、役割・読み込みに信頼が必要か・書き方の例が表示されます。"
    >
      <div className="widget-grid lead-right">
        <div className="fs-tree">
          {GROUPS.map((group) => (
            <div key={group.id}>
              <div className="fs-group">{group.label}</div>
              {items
                .filter((i) => i.group === group.id)
                .map((i) => (
                  <button
                    key={i.path}
                    type="button"
                    className="fs-item"
                    aria-pressed={i.path === selected}
                    onClick={() => setSelected(i.path)}
                  >
                    {i.path.endsWith("/") ? "📁" : "📄"} {i.path}
                  </button>
                ))}
            </div>
          ))}
        </div>
        <div>
          <div className="detail-card" style={{ marginBottom: 12 }}>
            <h4>{item.path}</h4>
            <p style={{ margin: "0 0 8px" }}>{item.summary}</p>
            <span className="chip">
              プロジェクトの信頼: {item.trust === "—" ? "対象外（ユーザー設定）" : item.trust}
            </span>
          </div>
          {item.example && (
            <CodeBlock code={item.example.code} language={item.example.language} title={item.path} />
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
