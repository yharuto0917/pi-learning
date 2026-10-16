import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { RpcPlayground } from "../../widgets/rpc-playground";

export function RpcModesLesson() {
  return (
    <>
      <h2>3 つの CLI モード</h2>
      <DataTable
        head={["モード", "インターフェース", "寿命", "向いている用途"]}
        rows={[
          ["print（-p）", "最終テキストを stdout", "1 回", "スクリプト、コマンド置換、パイプ"],
          ["JSON（--mode json）", "JSONL のイベントを stdout", "1 回", "途中経過も構造化して記録したい"],
          [
            "RPC（--mode rpc）",
            "JSONL のコマンド・応答・イベント",
            "常駐",
            "別言語・IDE・独自 UI からの双方向制御",
          ],
        ]}
      />
      <CodeBlock
        language="bash"
        code={`pi -p "Summarize the changes in this repository"
git diff | pi -p "Review this change"
pi --mode json "Inspect this repository" > events.jsonl
pi --mode rpc --no-session`}
      />
      <p>
        モデル・ツール・セッションの CLI オプションはどのモードでも使えます。stdin か stdout
        がリダイレクトされていて JSON / RPC の指定がなければ、自動的に print モードになります。print
        モードは、応答が error / aborted
        で終わったり、出力トークン上限（length）で切れたりすると非ゼロで終了します。
      </p>

      <h2>RPC プロトコル</h2>
      <DataTable
        head={["方向", "レコード", "役割"]}
        rows={[
          ["stdin", "コマンド", "プロンプト送信、状態取得、設定変更、セッション操作"],
          ["stdout", <code key="a">response</code>, "1 つのコマンドの成否と返却データ"],
          ["stdout", "セッションイベント", "実行・メッセージ・ツール・キュー・コンパクション・リトライ"],
          ["双方向", "拡張機能 UI レコード", "拡張機能のダイアログや通知をクライアントに転送"],
        ]}
      />
      <RpcPlayground />
      <h3>押さえるべき 4 点</h3>
      <ol>
        <li>
          <strong>id で対応付ける</strong>：コマンドは非同期に処理されるので、応答の順番ではなく{" "}
          <code>id</code> で突き合わせます。
        </li>
        <li>
          <strong>受理 ≠ 完了</strong>：<code>prompt</code> の <code>success: true</code>{" "}
          は受け付けたという意味。<code>data.disposition</code> は <code>started</code> / <code>queued</code>{" "}
          / <code>handled</code>。
        </li>
        <li>
          <strong>agent_settled まで待つ</strong>：<code>agent_end</code>{" "}
          の後にもリトライ・コンパクション・キュー処理が続くことがあります。
        </li>
        <li>
          <strong>実行中の prompt</strong>には <code>streamingBehavior: "steer" | "followUp"</code>{" "}
          が必要。指定がなければエラーです。
        </li>
      </ol>

      <h2>フレーミングの落とし穴</h2>
      <p>
        RPC は LF（<code>\n</code>）だけで区切る厳密な JSONL です。1 行に 1 つの JSON を書き、stdout
        はバイト列として読み続けます（読むのを止めると Pi が詰まります）。診断ログは stderr
        に出るので、プロトコルとして解析しないこと。
      </p>
      <Callout kind="warn" title="Node.js の readline は使わない">
        readline は U+2028 / U+2029 でも行を分割します。これらは JSON
        文字列の中に正当に現れるため、レコードが壊れます。TypeScript なら公式の <code>RpcClient</code>{" "}
        を使うのが確実です。
      </Callout>
      <CodeBlock
        language="python"
        title="minimal_client.py"
        code={`import json, subprocess

process = subprocess.Popen(["pi", "--mode", "rpc", "--no-session"],
                           stdin=subprocess.PIPE, stdout=subprocess.PIPE)

command = {"id": "prompt-1", "type": "prompt", "message": "Hello"}
process.stdin.write(json.dumps(command).encode("utf-8") + b"\\n")
process.stdin.flush()

while line := process.stdout.readline():   # バイナリの readline は LF だけで区切る
    record = json.loads(line)
    if record.get("type") == "message_update":
        update = record["assistantMessageEvent"]
        if update["type"] == "text_delta":
            print(update["delta"], end="", flush=True)
    elif record.get("type") == "agent_settled":
        break

process.stdin.close()   # stdin を閉じると Pi は順序よく終了する
process.wait()`}
      />
    </>
  );
}
