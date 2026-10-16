import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { TemplatePlayground } from "../../widgets/template-playground";

export function PromptTemplatesLesson() {
  return (
    <>
      <h2>Markdown 1 枚で / コマンド</h2>
      <p>
        プロンプトテンプレートは、Markdown ファイルを再利用可能な <code>/</code>{" "}
        コマンドに変えます。実行可能な振る舞いや大量の補助資料は不要で、「同じ依頼を何度も書いている」ときに最適です。
      </p>
      <CodeBlock
        language="markdown"
        title="~/.pi/agent/prompts/review.md"
        code={`---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes. Focus on \${1:-correctness, security, and error handling}.`}
      />
      <ul>
        <li>
          <strong>ファイル名がコマンド名</strong>になります（<code>/review</code>）。
        </li>
        <li>
          <code>description</code> は補完に表示されます。省略すると最初の空でない行（60
          文字まで）が使われます。
        </li>
        <li>
          <code>argument-hint</code> は任意。必須は <code>&lt;山かっこ&gt;</code>、任意は{" "}
          <code>[角かっこ]</code> で書くのが慣例です。
        </li>
      </ul>

      <h2>引数の置換ルール</h2>
      <DataTable
        head={["書き方", "結果"]}
        rows={[
          [<code key="a">$1, $2, …</code>, "位置引数 1 つ"],
          [<code key="b">$@ / $ARGUMENTS</code>, "すべての引数を空白でつないだもの"],
          [<code key="c">{"${1:-default}"}</code>, "1 番目の引数。ない（空）なら既定値"],
          [<code key="d">{"${@:-default}"}</code>, "すべての引数。ないなら既定値"],
          [<code key="e">{"${@:N}"}</code>, "N 番目以降の引数"],
          [<code key="f">{"${@:N:L}"}</code>, "N 番目から L 個の引数"],
        ]}
      />
      <p>
        引数はシェル風にクォートを解釈するので、<code>/review "API compatibility"</code> は空白を含む 1
        つの引数になります。置換後の値に <code>$1</code> などが含まれていても、再帰的には展開されません。
      </p>

      <TemplatePlayground />

      <h2>置き場所と読み込み</h2>
      <p>
        個人用は <code>~/.pi/agent/prompts/</code>、プロジェクト用は <code>.pi/prompts/</code>{" "}
        に置きます。これらの規定ディレクトリでは<strong>直下の .md ファイルだけ</strong>
        が読み込まれます。サブディレクトリを使いたい場合は settings.json
        やパッケージのマニフェストで明示します。 追加・変更したら <code>/reload</code> してください。
      </p>
      <Callout kind="note" title="拡張機能との関係">
        エディターの入力は、テンプレートとして展開される前に拡張機能の <code>input</code>{" "}
        イベントに届きます。同名の拡張機能コマンドがあれば、そちらが優先して処理します。
      </Callout>
    </>
  );
}
