import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { ExtensionBuilder } from "../../widgets/extension-builder";

export function ExtensionsLesson() {
  return (
    <>
      <h2>拡張機能 = Pi のプロセス内で動く TypeScript</h2>
      <p>
        拡張機能は、Pi に<strong>実行可能な振る舞い</strong>を足す TypeScript
        モジュールです。ツールの追加、パスの保護、危険なコマンドの確認、
        セッションイベントへの反応、コンテキストの加工、コマンドやステータス表示の追加——指示だけでは足りないことはここで実現します。
      </p>
      <CodeBlock
        language="ts"
        title="~/.pi/agent/extensions/hello.ts"
        code={`import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("hello", {
    description: "Show a greeting",
    handler: async (name, ctx) => {
      ctx.ui.notify(\`Hello, \${name || "world"}!\`, "info");
    },
  });
}`}
      />
      <p>
        既定のエクスポートが <code>ExtensionAPI</code>（慣例で <code>pi</code>）を受け取る
        <strong>ファクトリー関数</strong>
        です。Pi は jiti で読み込むので、TypeScript のままコンパイル不要で動きます。開発中は{" "}
        <code>pi --extension ./hello.ts</code> で 1 回だけ読み込めます。
      </p>

      <h2>統合ポイントを選ぶ</h2>
      <DataTable
        head={["やりたいこと", "主な API"]}
        rows={[
          ["ライフサイクルを観察・変更", <code key="a">pi.on()</code>],
          ["モデルが呼べる操作を追加", <code key="b">pi.registerTool()</code>],
          ["/ コマンドを追加", <code key="c">pi.registerCommand()</code>],
          ["ショートカット・CLI フラグ", <code key="d">pi.registerShortcut() / pi.registerFlag()</code>],
          ["メッセージを送る", <code key="e">pi.sendUserMessage() / pi.sendMessage()</code>],
          ["コンテキスト外のデータを保存", <code key="f">pi.appendEntry()</code>],
          ["モデルプロバイダーを追加", <code key="g">pi.registerProvider()</code>],
          ["MCP サーバーを追加", <code key="h">pi.registerMcpServer()</code>],
          ["他の拡張機能と通信", <code key="i">pi.events</code>],
        ]}
      />

      <ExtensionBuilder />

      <h2>ライフサイクルの約束事</h2>
      <ul>
        <li>
          ファクトリーは同期でも非同期でもよく、非同期なら Pi
          は完了を待ちます（起動時に必要な設定の取得やプロバイダー登録に使える）。
        </li>
        <li>
          <strong>ファクトリーでプロセス・ソケット・ファイル監視・タイマーを始めない</strong>
          。セッションを開始せずに拡張機能を読み込む場面があるためです。<code>session_start</code>{" "}
          か、必要とするコマンド・ツールの中で始め、<code>session_shutdown</code> で冪等に片付けます。
        </li>
        <li>
          <code>/reload</code> は拡張機能のランタイムを丸ごと作り直します。<code>await ctx.reload()</code>{" "}
          の後で古いランタイムの状態を使わないこと。
        </li>
        <li>
          <code>agent_before_settle</code> は最後に手を加えられる境界（エントリー追加や 1
          回の続行要求ができる）、<code>agent_settled</code> は通知のみの最終イベントです。
        </li>
      </ul>

      <h2>イベントとツールの約束事</h2>
      <ul>
        <li>
          ハンドラーは読み込み・登録順に実行されます。イベントごとに戻り値の意味（通知・変換・置換・キャンセル）が違うので型を確認します。
        </li>
        <li>
          <code>tool_call</code> は入力の書き換えや実行のブロックができます。
          <strong>このハンドラーが失敗すると、安全側に倒してツールはブロック</strong>されます。
        </li>
        <li>
          ツールの <code>execute()</code>{" "}
          で例外を投げると失敗結果になります。オブジェクトを返しただけではエラー扱いになりません。結果には
          モデル向けの <code>content</code> と、描画・状態復元用の <code>details</code> を入れます。
        </li>
        <li>
          1
          つのアシスタントメッセージのツール呼び出しは並列に走ることがあります。共有する状態があるツールは逐次実行にします。
        </li>
        <li>大きな出力は切り詰め、全文の場所をモデルに伝えます。</li>
      </ul>

      <h2>状態をどこに持つか</h2>
      <DataTable
        head={["状態", "保存先"]}
        rows={[
          ["アクティブブランチに追従するツールの状態", "ツール結果の details"],
          ["モデルのコンテキストに入れない永続データ", <code key="a">pi.appendEntry()</code>],
          ["保存してモデルにも送るカスタム内容", <code key="b">pi.sendMessage()</code>],
          ["セッションをまたぐデータ", "外部ストレージ"],
        ]}
      />
      <Callout kind="tip" title="ブランチに強い状態管理">
        公式の <code>todo.ts</code> の例は、TODO リストをツール結果の details に保存し、
        <code>session_start</code> で <code>ctx.sessionManager.getBranch()</code> から再構築します。/tree
        で過去に戻っても、その時点の TODO が正しく復元されます。
      </Callout>

      <h2>モードごとの違い</h2>
      <p>
        拡張機能は対話・RPC・JSON・print のすべてのモードで読み込まれます。完全な UI
        があるのは対話モードだけで、RPC は一部のダイアログと通知のみ、JSON と print には UI
        がありません。端末専用の処理は <code>ctx.mode === "tui"</code>、ダイアログは <code>ctx.hasUI</code>{" "}
        で分岐し、ツールやイベントの振る舞いは描画から独立させておきます。
      </p>
      <Callout kind="warn">
        拡張機能は Pi
        と同じ権限で、プロンプト・ファイル・認証情報・セッション履歴にアクセスできます。信頼できるソースのものだけを読み込みましょう。
      </Callout>
    </>
  );
}
