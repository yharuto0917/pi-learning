import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { SdkBuilder } from "../../widgets/sdk-builder";

export function SdkLesson() {
  return (
    <>
      <h2>最小のコード</h2>
      <p>
        <code>@earendil-works/pi-coding-agent</code> は CLI であると同時に SDK でもあります。
        <code>createAgentSession()</code> を呼ぶだけで、CLI
        と同じエージェント・セッション・ツール・モデル・リソースを Node.js / Bun のプロセス内で使えます。
      </p>
      <CodeBlock
        language="ts"
        code={`import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.prompt("What files are in the current directory?");
  console.log(session.getLastAssistantText());
} finally {
  session.dispose();
}`}
      />
      <p>
        オプションなしだと、作業ディレクトリ・見つかったリソース・保存済みの設定と認証情報をそのまま使います。
        <code>prompt()</code> は実行（自動リトライを含む）が終わると解決します。
      </p>

      <h2>差し替えられる境界</h2>
      <DataTable
        head={["オプション", "制御するもの"]}
        rows={[
          [<code key="a">modelRuntime / model / thinkingLevel</code>, "モデルへのアクセスと選択"],
          [<code key="b">settingsManager</code>, "設定（ファイル or インメモリ）"],
          [<code key="c">sessionManager</code>, "会話履歴（永続 or SessionManager.inMemory()）"],
          [
            <code key="d">resourceLoader</code>,
            "拡張機能・スキル・テンプレート・テーマ・コンテキストファイル・システムプロンプト",
          ],
          [<code key="e">tools / noTools / excludeTools / customTools</code>, "有効なツール"],
          [<code key="f">cwd / agentDir</code>, "作業ディレクトリと設定ディレクトリ"],
        ]}
      />

      <SdkBuilder />

      <h2>守るべき作法</h2>
      <ul>
        <li>
          <strong>
            <code>tools</code> は許可リスト
          </strong>
          。指定すると一致したツールだけが有効になるので、<code>customTools</code>{" "}
          で足したツールの名前も含めます。組み込みツールだけを外すなら <code>noTools: "builtin"</code>、
          <code>+name</code> / <code>-name</code> だけのリストなら既定の選択への追加・削除になります。
        </li>
        <li>
          <strong>購読は prompt の前に</strong>。<code>session.subscribe()</code>{" "}
          でストリーミングを受け取ります。<code>message_end</code> が確定したメッセージ、Pi
          がもう自動で続けないことを知りたいときは <code>agent_settled</code> を見ます。
        </li>
        <li>
          実行中に追加で送るなら <code>session.steer()</code> か <code>session.followUp()</code>
          。どちらか指定せずに <code>prompt()</code> すると拒否されます。止めるのは <code>abort()</code>
          、待つだけなら <code>waitForIdle()</code>。
        </li>
        <li>
          使い終わったら <code>session.dispose()</code>
          。実行を止め、拡張機能のコンテキストを無効化し、リスナーを外します。
        </li>
        <li>
          履歴の正は <code>SessionManager</code>
          。外部の履歴を復元したいときはエントリーを持つマネージャーを渡します。
          <code>session.agent.state.messages</code> を書き換えても永続コンテキストは置き換わりません。
        </li>
        <li>
          <code>AgentSessionRuntime</code> の <code>newSession()</code>・<code>fork()</code>{" "}
          などはセッションを丸ごと入れ替えるので、購読をやり直します。
        </li>
      </ul>
      <Callout kind="note" title="CLI との違い：組み込み拡張">
        CLI は codemode・tool_search・MCP を組み込み拡張として読み込みますが、SDK
        セッションでは読み込まれません。必要なら <code>createCodemodeExtension()</code>・
        <code>createToolSearchExtension()</code>・<code>createMcpExtension()</code> を{" "}
        <code>DefaultResourceLoader</code> の <code>extensionFactories</code> に追加し、MCP を使うなら{" "}
        <code>session.bindExtensions()</code> を呼びます。
      </Callout>
      <p>
        すべてのサンプルはリポジトリの <code>packages/coding-agent/examples/sdk/</code>{" "}
        にあり、型チェックされています（01-minimal 〜 14-codemode-mcp）。
      </p>
    </>
  );
}
