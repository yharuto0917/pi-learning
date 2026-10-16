import { useState } from "react";
import { CodeBlock } from "../components/code-block";
import { WidgetFrame } from "../components/widget-frame";

interface Scenario {
  id: string;
  situation: string;
  mode: string;
  why: string;
  code: string;
  language: string;
}

const scenarios: Scenario[] = [
  {
    id: "human",
    situation: "自分がターミナルで Pi と対話しながら作業したい",
    mode: "対話モード（Interactive）",
    why: "ターミナル UI で会話・ツール実行・セッション操作がすべてできます。stdin と stdout が端末なら既定でこのモードです。",
    code: "cd ~/projects/my-app\npi",
    language: "bash",
  },
  {
    id: "script",
    situation: "シェルスクリプトで、最終的な回答テキストだけが欲しい",
    mode: "print モード（-p）",
    why: "プロンプトを実行し、最後のアシスタント応答だけを stdout に書いて終了します。パイプで stdin を渡すこともできます。",
    code: 'git diff | pi -p "この変更をレビューして"',
    language: "bash",
  },
  {
    id: "ci",
    situation: "CI で実行し、ツール呼び出しなど途中経過も構造化して記録したい",
    mode: "JSON モード（--mode json）",
    why: "1 回の実行のエージェントイベントを JSONL で書き出して終了します。後から集計・可視化できます。",
    code: 'pi --mode json "依存関係の更新点を調べて" > events.jsonl',
    language: "bash",
  },
  {
    id: "rpc",
    situation: "Python や Go のアプリから、Pi を常駐させて双方向に制御したい",
    mode: "RPC モード（--mode rpc）",
    why: "stdin に JSONL のコマンドを送り、stdout から応答とイベントを受け取ります。言語を問わず、プロセスも分離できます。",
    code: 'pi --mode rpc --no-session\n{"id":"req-1","type":"prompt","message":"Hello"}',
    language: "bash",
  },
  {
    id: "sdk",
    situation: "Node.js / Bun のアプリに、Pi のエージェントを直接組み込みたい",
    mode: "TypeScript SDK",
    why: "同じプロセス内で AgentSession を作り、TypeScript のメソッドとイベントで完全に制御できます。",
    code: `import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();
await session.prompt("このディレクトリのファイルは？");
console.log(session.getLastAssistantText());
session.dispose();`,
    language: "ts",
  },
];

export function ModeFinder() {
  const [selected, setSelected] = useState(scenarios[0].id);
  const scenario = scenarios.find((s) => s.id === selected) ?? scenarios[0];

  return (
    <WidgetFrame
      title="どのモードで使う？"
      description="状況を選ぶと、適した使い方とコマンド例が表示されます。"
    >
      <div className="widget-grid">
        <fieldset className="fs-tree" aria-label="状況">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              className="fs-item"
              aria-pressed={s.id === selected}
              style={{
                fontFamily: "var(--font-sans)",
                whiteSpace: "normal",
                lineHeight: 1.5,
                padding: "8px 10px",
              }}
              onClick={() => setSelected(s.id)}
            >
              {s.situation}
            </button>
          ))}
        </fieldset>
        <div>
          <div className="detail-card" style={{ marginBottom: 12 }}>
            <h4 style={{ fontFamily: "var(--font-sans)" }}>→ {scenario.mode}</h4>
            {scenario.why}
          </div>
          <CodeBlock code={scenario.code} language={scenario.language} />
        </div>
      </div>
    </WidgetFrame>
  );
}
