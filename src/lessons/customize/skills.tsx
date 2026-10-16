import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { SkillValidatorWidget } from "../../widgets/skill-validator-widget";

export function SkillsLesson() {
  return (
    <>
      <h2>スキルとは</h2>
      <p>
        スキルは、特定の種類の作業のための<strong>専門的な指示と補助ファイルのセット</strong>
        です。テンプレートより多くの文脈が必要だが、新しい実行可能なしくみまでは要らない——そんなときに使います。Pi
        は{" "}
        <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">
          Agent Skills 仕様
        </a>{" "}
        を実装しているので、他のエージェントと同じ形式のスキルを使い回せます。
      </p>
      <CodeBlock
        language="text"
        title="スキルの構成"
        code={`pdf-tools/
├── SKILL.md
├── scripts/
│   └── extract.sh
├── references/
│   └── formats.md
└── assets/
    └── template.json`}
      />

      <h2>読み込みのしくみ</h2>
      <ol>
        <li>
          起動時、Pi は各スキルの<strong>名前・説明・パス</strong>だけをシステムプロンプトに載せる
        </li>
        <li>
          タスクが合致すると、モデルが自分で <code>SKILL.md</code> を読み、その指示に従う
        </li>
        <li>
          モデルが読み忘れることもあるので、確実に使いたいときは{" "}
          <code>/skill:pdf-tools extract report.pdf</code>{" "}
          のように明示する（後ろの文字列はユーザーの依頼として追加される）
        </li>
      </ol>
      <Callout kind="tip" title="description がすべて">
        モデルがスキルを選ぶ手がかりは description
        だけです。「何をするか」と「いつ使うか」の両方を書きましょう。「Helps with
        PDFs」のような説明では判断できません。
      </Callout>

      <SkillValidatorWidget />

      <h2>フロントマターのフィールド</h2>
      <DataTable
        head={["フィールド", "用途"]}
        rows={[
          [<code key="a">name</code>, "コマンド名・表示名。小文字・数字・ハイフン、最大 64 文字"],
          [<code key="b">description</code>, "モデル向けのルーティング説明（必須、最大 1024 文字）"],
          [<code key="c">license</code>, "ライセンス名または同梱ファイル"],
          [<code key="d">compatibility</code>, "環境要件"],
          [<code key="e">metadata</code>, "追加のキーと値"],
          [<code key="f">allowed-tools</code>, "事前承認するツール（実験的）"],
          [<code key="g">disable-model-invocation</code>, "true でモデルの自動選択から外す"],
        ]}
      />
      <p>
        不正なフィールドの多くは起動を止めず警告になります。ただしフロントマターが壊れているもの、description
        がないものは読み込まれません。名前が衝突した場合は先に見つかった方が使われ、警告が出ます。
      </p>

      <h2>置き場所</h2>
      <p>
        <code>~/.pi/agent/skills/</code> と <code>.pi/skills/</code> の下で、<code>SKILL.md</code>{" "}
        を含むディレクトリが再帰的に探索されます。Agent Skills 共通の <code>~/.agents/skills/</code> と{" "}
        <code>.agents/skills/</code> にも対応しています。参考になるスキル集として、Anthropic の skills
        リポジトリや pi-skills があります。
      </p>
    </>
  );
}
