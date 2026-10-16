import { Callout } from "../../components/callout";
import { DataTable } from "../../components/data-table";
import { ModeFinder } from "../../widgets/mode-finder";

export function WhatIsPiLesson() {
  return (
    <>
      <h2>「エージェントハーネス」とは</h2>
      <p>
        LLM
        そのものは文章を生成するだけです。ファイルを読む、コマンドを実行する、結果を見て次の手を考える——こうした
        <strong>「モデルに道具を持たせ、繰り返し考えさせる」ための外枠</strong>
        をエージェントハーネスと呼びます。プロンプトの組み立て、ツールの実行、会話履歴の保存、モデルとの通信を担うのがハーネスの仕事です。
      </p>
      <p>
        Pi は自らを <em>“a minimal, extensible agent harness that you can make your own”</em>{" "}
        と説明しています。中心にあるのは「ワークフローを Pi に合わせるのではなく、Pi
        をワークフローに合わせる」という考え方です。
      </p>

      <h2>最小限のコアと、あとから足す拡張性</h2>
      <p>
        Pi
        は強力なデフォルト（ファイルの読み書き、シェル実行、セッション管理、多数のモデル対応）を備える一方で、
        <strong>サブエージェントやプランモードのような機能はあえて同梱していません</strong>。必要なら Pi
        自身に作らせるか、誰かが作ったパッケージを入れます。システムプロンプトも最小限に保たれていて、トークン効率が良いのも特徴です。
      </p>
      <DataTable
        head={["Pi が提供するもの", "あとから足すもの"]}
        rows={[
          ["read・bash・edit・write などの組み込みツール", "独自ツール・コマンド（拡張機能）"],
          ["ツリー構造のセッションとコンパクション", "サブエージェント、プランモード、権限確認"],
          ["15 以上のプロバイダーと数百のモデル", "独自プロバイダー（models.json / 拡張機能）"],
          ["AGENTS.md・スキル・テンプレートの読み込み", "スキル・テンプレート・テーマ・パッケージ"],
        ]}
      />
      <Callout kind="tip" title="Pi に Pi を作らせる">
        公式サイトのデモでは、Pi 自身にワークフロー用の拡張機能を書かせ、<code>/reload</code>{" "}
        して即座に使っています。「足りない機能は Pi に作らせる」がこのツールの基本的な使い方です。
      </Callout>

      <h2>モノレポの構成</h2>
      <p>
        Pi は CLI だけでなく、それを支えるライブラリ群として公開されています。第 3
        部で詳しく扱いますが、全体像だけ先に見ておきましょう。
      </p>
      <DataTable
        head={["パッケージ", "役割"]}
        rows={[
          [
            <code key="a">@earendil-works/pi-ai</code>,
            "OpenAI・Anthropic・Google などを統一 API で扱う LLM 層",
          ],
          [
            <code key="b">@earendil-works/pi-agent-core</code>,
            "ツール呼び出しと状態管理を持つエージェント実行基盤",
          ],
          [
            <code key="c">@earendil-works/pi-coding-agent</code>,
            "対話型コーディングエージェント CLI（pi コマンド）と SDK",
          ],
          [<code key="d">@earendil-works/pi-tui</code>, "差分レンダリングのターミナル UI ライブラリ"],
          [<code key="e">@earendil-works/pi-durable</code>, "永続化された会話・タスクの実行基盤（実験的）"],
        ]}
      />

      <h2>4 つの使い方</h2>
      <p>
        同じエージェント・セッション・ツールの仕組みを、4
        つの入口から使えます。違うのは「入力がどう入り、出力がどう出るか」だけです。
      </p>
      <ModeFinder />

      <h2>セキュリティの前提</h2>
      <Callout kind="warn" title="Pi はサンドボックスではない">
        Pi のツールと拡張機能は、Pi を起動したプロセスと<strong>同じ OS 権限</strong>
        で動きます。ツール呼び出しのたびに確認を求めることもしません。プロジェクトの信頼（trust）は「どのプロジェクトリソースを読み込むか」を決めるだけで、ツール呼び出しを隔離するものではありません。
      </Callout>
      <p>
        信頼できないリポジトリや無人での実行では、コンテナ化を検討します。公式ドキュメントでは、ツールだけを
        Linux マイクロ VM に送る Gondolin 拡張、Pi 全体を Docker で動かす方法、ポリシー制御された OpenShell の
        3 パターンが紹介されています。
      </p>
    </>
  );
}
