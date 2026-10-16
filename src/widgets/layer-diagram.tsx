import { useState } from "react";
import { WidgetFrame } from "../components/widget-frame";

interface Layer {
  id: string;
  name: string;
  short: string;
  detail: string;
  useWhen: string;
  example: string;
}

const LAYERS: Layer[] = [
  {
    id: "modes",
    name: "インターフェース",
    short: "対話 / print・JSON / RPC / SDK",
    detail: "同じエージェントとセッションを、4 つの入口から使う。CLI のモードは入力と出力の形だけが違う。",
    useWhen: "既存の Pi をそのまま使う・スクリプトや別言語から呼ぶ",
    example: "pi --mode rpc / createAgentSession()",
  },
  {
    id: "coding-agent",
    name: "pi-coding-agent",
    short: "Pi 本体（CLI と SDK）",
    detail:
      "AgentSession・SessionManager（ツリー型セッション）・ResourceLoader（AGENTS.md・スキル・拡張機能の探索）・組み込みツール・コンパクション・設定・モデル管理をまとめた、完成品のハーネス。",
    useWhen: "Pi の機能（セッション・拡張機能・スキル）をそのまま自分のアプリに組み込みたい",
    example: "createAgentSession({ tools, sessionManager, resourceLoader })",
  },
  {
    id: "agent-core",
    name: "pi-agent-core",
    short: "エージェントループと状態",
    detail:
      "Agent クラスと agentLoop。ツール呼び出しの実行（並列／逐次）、steering と follow-up のキュー、beforeToolCall などのフック、イベント配信を担う。ファイル操作やセッション保存は持たない。",
    useWhen: "コーディング用途ではない独自エージェントを、最小の部品から組みたい",
    example: "new Agent({ initialState, streamFn })",
  },
  {
    id: "ai",
    name: "pi-ai",
    short: "LLM の統一 API",
    detail:
      "OpenAI・Anthropic・Google・Bedrock など多数のプロバイダーを同じ形で扱う。ストリーミング、ツール定義（TypeBox）、思考レベル、トークンとコスト集計、モデル間の受け渡し。",
    useWhen: "モデル呼び出しだけが欲しい・ループは自前で書きたい",
    example: "models.stream(model, context)",
  },
];

const SIDE = [
  {
    name: "pi-tui",
    detail: "差分レンダリングのターミナル UI。Pi の画面や拡張機能の独自コンポーネントで使う。",
  },
  {
    name: "pi-durable（実験的）",
    detail:
      "会話・ターン・ツール呼び出しを先にストレージへ確定させ、プロセスが落ちても再開できるハーネス。API は予告なく変わる。",
  },
];

export function LayerDiagram() {
  const [selected, setSelected] = useState("coding-agent");
  const layer = LAYERS.find((l) => l.id === selected) ?? LAYERS[1];

  return (
    <WidgetFrame
      title="Pi のレイヤー図"
      description="層をクリックすると、役割と「どんなときにこの層から組むか」が表示されます。下の層ほど小さく、自由度が高くなります。"
    >
      <div className="widget-grid lead-left">
        <div className="layers">
          {LAYERS.map((l) => (
            <button
              key={l.id}
              type="button"
              className="layer"
              aria-pressed={l.id === selected}
              onClick={() => setSelected(l.id)}
            >
              <span className="layer-name">{l.name}</span>
              <span className="layer-desc">{l.short}</span>
            </button>
          ))}
          <div className="mode-row" style={{ marginTop: 6 }}>
            {SIDE.map((s) => (
              <div
                key={s.name}
                className="mode-chip"
                style={{ gridColumn: "span 2", textAlign: "left", cursor: "default" }}
              >
                <strong className="mono" style={{ fontSize: 12 }}>
                  {s.name}
                </strong>
                <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
                  {s.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="detail-card" aria-live="polite">
          <h4>{layer.name}</h4>
          <p style={{ margin: "0 0 10px" }}>{layer.detail}</p>
          <div className="panel-label">この層から組むとき</div>
          <p style={{ margin: "0 0 10px" }}>{layer.useWhen}</p>
          <div className="panel-label">入口</div>
          <code>{layer.example}</code>
        </div>
      </div>
    </WidgetFrame>
  );
}
