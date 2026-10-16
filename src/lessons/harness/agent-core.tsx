import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { AgentLoopSimulator } from "../../widgets/agent-loop-simulator";

export function AgentCoreLesson() {
  return (
    <>
      <h2>Agent を作る</h2>
      <p>
        <code>@earendil-works/pi-agent-core</code> の <code>Agent</code> は、pi-ai
        の上に「ツールを呼び、結果を読み、また考える」ループと状態管理を載せたものです。ファイル操作もセッション保存も持たないので、どんな用途のエージェントにも使えます。
      </p>
      <CodeBlock
        language="ts"
        title="agent.ts"
        code={`import { Agent } from "@earendil-works/pi-agent-core";
import { createModels } from "@earendil-works/pi-ai";
import { anthropicProvider } from "@earendil-works/pi-ai/providers/anthropic";

const models = createModels();
models.setProvider(anthropicProvider());
const model = models.getModel("anthropic", "claude-sonnet-4-6");
if (!model) throw new Error("Model not found");

const agent = new Agent({
  initialState: { systemPrompt: "You are a helpful assistant.", model },
  streamFn: models.streamSimple.bind(models),
});

agent.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

await agent.prompt("Hello!");`}
      />

      <h2>ツールを定義する</h2>
      <CodeBlock
        language="ts"
        title="read-file-tool.ts"
        code={`import { readFile } from "node:fs/promises";
import type { AgentTool } from "@earendil-works/pi-agent-core";
import { Type } from "typebox";

export const readFileTool: AgentTool = {
  name: "read_file",
  label: "Read File",
  description: "Read a file's contents",
  parameters: Type.Object({ path: Type.String({ description: "File path" }) }),
  async execute(_toolCallId, params, _signal, onUpdate) {
    onUpdate?.({ content: [{ type: "text", text: "Reading..." }], details: {} }); // 途中経過（任意）
    const content = await readFile(params.path, "utf-8"); // 失敗は throw する
    return {
      content: [{ type: "text", text: content }],
      details: { path: params.path, size: content.length },
    };
  },
};

agent.state.tools = [readFileTool];`}
      />
      <Callout kind="warn" title="失敗は throw で伝える">
        エラーメッセージを content として返すのではなく、例外を投げます。Agent が捕まえて{" "}
        <code>isError: true</code> のツール結果としてモデルに伝えます。
      </Callout>

      <h2>イベントとフックを観察する</h2>
      <p>
        条件を変えながら、イベントとフックの順序を確かめましょう。特に「並列実行のときの終了順と結果の順」「terminate
        の効き方」「finishTurn の end と continue」は設計に直結します。
      </p>
      <AgentLoopSimulator variant="advanced" />

      <h2>フック一覧</h2>
      <DataTable
        head={["フック", "タイミング", "できること"]}
        rows={[
          [
            <code key="a">beforeToolCall</code>,
            "tool_execution_start と引数検証の後",
            "実行をブロック（block / reason / terminate）",
          ],
          [
            <code key="b">afterToolCall</code>,
            "実行後、tool_execution_end の前",
            "結果の加工、terminate の付与",
          ],
          [
            <code key="c">prepareRequest</code>,
            "毎回のプロバイダー呼び出しの直前",
            "正規のコンテキストに差し替える",
          ],
          [
            <code key="d">finishTurn</code>,
            "応答とツール結果が確定し、turn_end の前",
            "end で終了、continue で 1 回続行",
          ],
          [
            <code key="e">transformContext</code>,
            "convertToLlm の前",
            "古いメッセージの削減、外部情報の注入",
          ],
          [<code key="f">convertToLlm</code>, "LLM に送る直前", "独自メッセージ型の除外・変換（必須）"],
        ]}
      />
      <CodeBlock
        language="text"
        title="メッセージの流れ"
        code={
          "AgentMessage[] → transformContext() → AgentMessage[] → convertToLlm() → Message[] → LLM\n                     (任意)                                  (必須)"
        }
      />
      <Callout kind="note" title="独自のメッセージ型">
        declaration merging で <code>CustomAgentMessages</code>{" "}
        を拡張すると、通知などアプリ固有のメッセージを会話に混ぜられます。LLM が理解できるのは
        user・assistant・toolResult だけなので、<code>convertToLlm</code> で除外・変換します。
      </Callout>

      <h2>steering と follow-up</h2>
      <p>
        <code>agent.steer(message)</code> はツール実行中の割り込み、<code>agent.followUp(message)</code>{" "}
        はエージェントが止まろうとしたときの追加依頼です。キューの取り出し方は <code>steeringMode</code> /{" "}
        <code>followUpMode</code> で <code>"one-at-a-time"</code>（既定）か <code>"all"</code> を選べます。
      </p>

      <h2>さらに低レベルに</h2>
      <p>
        <code>agentLoop()</code> / <code>agentLoopContinue()</code>{" "}
        を直接回すこともできます。ただしこれらは観察用のストリームで、イベント処理の完了を待たずに次へ進みます。メッセージ処理をツール実行前のバリアにしたい場合は{" "}
        <code>Agent</code> クラスを使います。
      </p>
    </>
  );
}
