import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { SessionTreeExplorer } from "../../widgets/session-tree-explorer";

export function SessionsLesson() {
  return (
    <>
      <h2>セッションはツリー</h2>
      <p>
        Pi は会話をセッションとして保存します。エントリーはツリー状につながっているので、
        <strong>以前の地点に戻って別の道を試しても、元の道は消えません</strong>
        。モデルが受け取るのは、ファイル内の全ブランチではなく、現在の位置に至るアクティブブランチだけです。
      </p>

      <h2>分岐の 3 つの方法</h2>
      <DataTable
        head={["操作", "結果", "使いどころ"]}
        rows={[
          [
            <code key="a">/tree</code>,
            "同じセッションファイル内で移動する",
            "関連する代替案を一緒に残したい",
          ],
          [
            <code key="b">/fork</code>,
            "以前のユーザーメッセージから新しいセッションを作る",
            "代替案を別の作業として独立させたい",
          ],
          [
            <code key="c">/clone</code>,
            "アクティブブランチを新しいセッションに複製する",
            "今の状態のコピーを別に持ちたい",
          ],
        ]}
      />
      <p>
        <code>/tree</code>{" "}
        でユーザーメッセージを選ぶと本文がエディターに戻り、編集して送ると分岐が生まれます。アシスタントの応答などを選ぶと、その直後から空のエディターで続けます。ブランチを離れるときには、離れたブランチの要約を新しいブランチに付けることもできます。
      </p>

      <SessionTreeExplorer />

      <h2>コンテキストを管理する：コンパクション</h2>
      <p>
        フッターには現在のコンテキスト使用量が出ています。モデルの上限に近づくと、Pi は通常、古い履歴を自動で
        <strong>コンパクション</strong>
        します。要約エントリーを追加し、直近のメッセージは残します。セッションファイルの元のエントリーは削除されません。
      </p>
      <CodeBlock
        code={"/compact\n/compact 認証まわりの設計判断は必ず残して"}
        language="text"
        title="手動コンパクション"
      />
      <Callout kind="note">
        自動コンパクションを無効にしても <code>/compact</code>{" "}
        は使えます。プロバイダーが要約リクエストを受け付けられないと失敗するので、その場合は原因を直してから再実行します。
      </Callout>

      <h2>保存場所とコマンドラインオプション</h2>
      <p>
        既定の保存先は <code>~/.pi/agent/sessions/</code> で、作業ディレクトリごとにまとまります。
      </p>
      <DataTable
        head={["オプション", "動作"]}
        rows={[
          [<code key="a">-c, --continue</code>, "このプロジェクトの最新セッションを開く"],
          [<code key="b">-r, --resume</code>, "セッションの選択画面を開く"],
          [<code key="c">--session &lt;path|id&gt;</code>, "パス・ID・ID の一部で開く"],
          [<code key="d">--fork &lt;path|id&gt;</code>, "既存のセッションから新しいセッションを作る"],
          [<code key="e">--no-session</code>, "保存しない（終了すると再開できない）"],
          [<code key="f">--session-dir &lt;dir&gt;</code>, "保存先を変える（環境変数や設定より優先）"],
          [<code key="g">-n, --name &lt;name&gt;</code>, "表示名を付ける"],
        ]}
      />
    </>
  );
}
