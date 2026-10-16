import { Callout } from "../../components/callout";
import { DataTable } from "../../components/data-table";
import { TerminalSimulator } from "../../widgets/terminal-simulator";

export function InteractiveLesson() {
  return (
    <>
      <h2>入力の基本</h2>
      <DataTable
        head={["操作", "効果"]}
        rows={[
          [<kbd key="a">Enter</kbd>, "送信"],
          [
            <span key="b">
              <kbd>Shift</kbd>+<kbd>Enter</kbd>
            </span>,
            "改行を入れる",
          ],
          [
            <span key="c">
              <kbd>Ctrl</kbd>+<kbd>G</kbd>
            </span>,
            "長いプロンプトを外部エディターで書く",
          ],
          [<code key="d">@</code>, "ファイルを検索してプロンプトに添付する"],
          [<kbd key="e">Tab</kbd>, "パスを補完する"],
          ["画像を貼り付け／ドラッグ", "対応ターミナルなら画像を添付"],
        ]}
      />

      <h2>シェルコマンドを混ぜる：! と !!</h2>
      <p>
        行頭に <code>!</code> を付けるとコマンドを実行し、<strong>その出力を会話に含めます</strong>。
        <code>!!</code> は実行するだけで、出力をモデルに送りません。テストの失敗ログを見せたいときは{" "}
        <code>!</code>、手元で確認したいだけなら <code>!!</code> です。
      </p>

      <h2>作業中の Pi に指示を出す</h2>
      <p>Pi が作業している間も入力できます。送り方によって、メッセージが届くタイミングが変わります。</p>
      <DataTable
        head={["やりたいこと", "操作", "タイミング"]}
        rows={[
          [
            "今のタスクを軌道修正",
            <kbd key="a">Enter</kbd>,
            "現在の応答とそのツール呼び出しが終わったら、次の応答の前に入る（steer）",
          ],
          [
            "今のタスクの後に追加",
            <span key="b">
              <kbd>Alt</kbd>+<kbd>Enter</kbd>
            </span>,
            "Pi が今のタスクを終えようとしたときに入る（follow-up）",
          ],
          [
            "キューをエディターに戻す",
            <span key="c">
              <kbd>Alt</kbd>+<kbd>↑</kbd>
            </span>,
            "送信待ちのメッセージを編集に戻す",
          ],
          [
            <span key="d">作業を止める</span>,
            <kbd key="e">Esc</kbd>,
            "中断し、キューのメッセージはエディターに戻る",
          ],
        ]}
      />
      <Callout kind="tip" title="steer はツール実行を壊さない">
        Enter
        で送ったメッセージは、実行中のツール呼び出しを途中で止めるのではなく、区切りの良いところ（ツールの実行完了後）で次の応答に反映されます。
      </Callout>

      <TerminalSimulator
        missions={[
          { id: "login", label: "/login で接続する" },
          { id: "bang", label: "!git status で出力を会話に入れる" },
          { id: "bangbang", label: "!!ls で出力を送らずに実行する" },
          { id: "attach", label: "@README.md を添付してテストの実行方法を聞く" },
          { id: "steer", label: "作業中に Enter で軌道修正（steer）する" },
          { id: "followup", label: "作業中に Alt+Enter で次の依頼（follow-up）を積む" },
          { id: "abort", label: "作業中に Esc で中断し、キューがエディターに戻るのを確認する" },
        ]}
      />

      <h2>よく使うコマンドとショートカット</h2>
      <DataTable
        head={["コマンド／キー", "用途"]}
        rows={[
          [
            <span key="a">
              <code>/model</code>・<kbd>Ctrl</kbd>+<kbd>L</kbd>
            </span>,
            "モデルを選ぶ",
          ],
          [<kbd key="b">Ctrl+P</kbd>, "お気に入りのモデルを切り替える（/scoped-models で範囲を設定）"],
          [
            <span key="c">
              <code>/thinking</code>・<kbd>Shift</kbd>+<kbd>Tab</kbd>
            </span>,
            "思考レベル（off〜max）を変える",
          ],
          [
            <span key="d">
              <kbd>Ctrl</kbd>+<kbd>O</kbd> / <kbd>Ctrl</kbd>+<kbd>T</kbd>
            </span>,
            "ツール出力／思考ブロックの展開",
          ],
          [
            <span key="e">
              <code>/copy</code>・<kbd>Ctrl</kbd>+<kbd>X</kbd>
            </span>,
            "最後の応答をコピー",
          ],
          [<code key="f">/export</code>, "セッションを HTML / JSONL に書き出す"],
          [<code key="g">/share</code>, "セッションをアップロードして閲覧リンクを得る"],
          [<code key="h">/hotkeys</code>, "現在有効なショートカットを確認"],
          [<code key="i">/debug</code>, "描画とセッション状態を pi-debug.log に書き出す"],
        ]}
      />
      <Callout kind="warn" title="共有する前に中身を確認">
        <code>/export</code> や <code>/share</code>{" "}
        で書き出すセッションには、プロンプト・ツール出力・ファイル内容、会話中に表示された認証情報まで含まれることがあります。
      </Callout>
    </>
  );
}
