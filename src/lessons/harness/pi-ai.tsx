import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { StreamReplay } from "../../widgets/stream-replay";

export function PiAiLesson() {
  return (
    <>
      <h2>Models コレクション</h2>
      <p>
        pi-ai では、プロバイダーを登録した <strong>Models コレクション</strong>
        を作り、そこからモデルを引いてストリーミングします。手早く始めるなら全組み込みプロバイダー入りの{" "}
        <code>builtinModels()</code>、バンドルサイズを気にするなら必要なプロバイダーだけを登録します。
      </p>
      <CodeBlock
        language="ts"
        title="quick-start.ts"
        code={`import { type Context, type Tool, Type } from "@earendil-works/pi-ai";
import { builtinModels } from "@earendil-works/pi-ai/providers/all";

const models = builtinModels();
const model = models.getModel("openai", "gpt-4o-mini")!;

// ツールは TypeBox のスキーマで定義する（型安全＋引数の検証）
const tools: Tool[] = [{
  name: "get_time",
  description: "Get the current time",
  parameters: Type.Object({
    timezone: Type.Optional(Type.String({ description: "e.g. Asia/Tokyo" })),
  }),
}];

// Context はシリアライズ可能で、別のモデルにそのまま渡せる
const context: Context = {
  systemPrompt: "You are a helpful assistant.",
  messages: [{ role: "user", content: "What time is it?", timestamp: Date.now() }],
  tools,
};

const stream = models.stream(model, context); // 認証は環境変数などから解決される
for await (const event of stream) {
  if (event.type === "text_delta") process.stdout.write(event.delta);
}
const message = await stream.result();
context.messages.push(message);`}
      />
      <p>
        個別に登録する場合は <code>createModels()</code> と{" "}
        <code>models.setProvider(anthropicProvider())</code> のように組み立てます。<code>streamSimple</code> /{" "}
        <code>completeSimple</code> はプロバイダー差を吸収した思考レベル指定などの統一インターフェースです。
      </p>

      <h2>ストリーミングイベント</h2>
      <p>
        成功時は <code>start → 更新イベント* → done</code>、生成開始後の失敗は{" "}
        <code>start → 更新* → error</code> の順です。注意したいのは、
        <strong>異なるブロックのイベントが交互に届くことがある</strong>点。各イベントの{" "}
        <code>contentIndex</code> でどのブロックの更新かを判断します。
      </p>
      <StreamReplay />
      <Callout kind="note" title="stopReason を見てループを回す">
        <code>done</code> の理由が <code>toolUse</code> なら、ツールを実行して <code>toolResult</code> を
        context に追加し、もう一度呼び出します。この繰り返しを自動化したものが次のレッスンの pi-agent-core
        です。
      </Callout>

      <h2>テストには faux プロバイダー</h2>
      <p>
        <code>fauxProvider()</code>{" "}
        はインメモリで台本どおりの応答（テキスト・思考・ツール呼び出し）を返すプロバイダーです。API
        キーも通信も不要で、決定的なテストが書けます。
      </p>
      <CodeBlock
        language="ts"
        title="faux.test.ts"
        code={`import { createModels, fauxAssistantMessage, fauxProvider, fauxText, fauxToolCall } from "@earendil-works/pi-ai";

const faux = fauxProvider();
const models = createModels();
models.setProvider(faux.provider);

faux.setResponses([
  fauxAssistantMessage([fauxText("確認します"), fauxToolCall("echo", { text: "package.json" })], { stopReason: "toolUse" }),
  fauxAssistantMessage("完了しました"),
]);

const first = await models.complete(faux.getModel(), {
  messages: [{ role: "user", content: "package.json を見て", timestamp: Date.now() }],
});
// first.stopReason === "toolUse"`}
      />

      <h2>そのほかの機能</h2>
      <ul>
        <li>トークン数とコストの集計、思考（reasoning）の統一指定</li>
        <li>セッション途中で別プロバイダーのモデルへ context を引き継ぐ（cross-provider handoff）</li>
        <li>画像入力・画像生成・分類（classifier）モデル</li>
        <li>
          OAuth プロバイダー、カスタムプロバイダー（<code>createProvider()</code>）、ブラウザー利用
        </li>
      </ul>
    </>
  );
}
