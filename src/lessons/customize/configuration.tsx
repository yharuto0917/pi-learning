import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { ConfigExplorer } from "../../widgets/config-explorer";

export function ConfigurationLesson() {
  return (
    <>
      <h2>2 つの設定レベル</h2>
      <p>
        Pi の設定は<strong>ユーザーレベル</strong>（エージェントディレクトリ。既定は <code>~/.pi/agent</code>
        ）と
        <strong>プロジェクトレベル</strong>（作業ディレクトリの <code>.pi</code>）の 2
        段構えです。プロジェクトの設定はユーザー設定の上に重なります。
        エージェントディレクトリの場所は環境変数 <code>PI_CODING_AGENT_DIR</code> で変えられます。
      </p>
      <ConfigExplorer />

      <h2>コンテキストファイル：AGENTS.md</h2>
      <p>
        <code>AGENTS.md</code>（または <code>CLAUDE.md</code>
        ）は、エージェントディレクトリ・作業ディレクトリ・その親ディレクトリから読み込まれます。
        あるディレクトリに置いたファイルは、Pi
        がそのディレクトリ以下で動くときに常に適用されます。モノレポなら、ルートに全体方針、各パッケージに固有のルール、という分け方ができます。
      </p>
      <CodeBlock
        language="text"
        title="読み込みのイメージ"
        code={`~/.pi/agent/AGENTS.md          ← 個人の方針（常に）
~/work/AGENTS.md                ← 親ディレクトリ
~/work/monorepo/AGENTS.md       ← リポジトリ全体
~/work/monorepo/packages/api/   ← ここで pi を起動すると、上の 3 つ＋ここの AGENTS.md`}
      />

      <h2>システムプロンプトを変える</h2>
      <p>
        <code>SYSTEM.md</code> は Pi の既定のシステムプロンプトを<strong>置き換え</strong>、
        <code>APPEND_SYSTEM.md</code> は<strong>追記</strong>します。信頼済みプロジェクトの <code>.pi/</code>{" "}
        にあるものが、エージェントディレクトリの同名ファイルより優先されます（2
        つが結合されることはありません）。
      </p>
      <Callout kind="note">
        Pi の既定のシステムプロンプトは意図的に短く作られています。置き換える前に、AGENTS.md や
        APPEND_SYSTEM.md の追記で足りないか検討しましょう。
      </Callout>

      <h2>プロジェクトの信頼（trust）</h2>
      <p>
        見知らぬリポジトリで Pi を起動すると、プロジェクトを信頼するか尋ねられることがあります。信頼すると{" "}
        <code>.pi/</code> の設定・拡張機能・スキル・テンプレート・パッケージ宣言が読み込まれます。
        <code>/trust</code> で判断を保存できます。
      </p>
      <Callout kind="warn">
        信頼は「プロジェクトのリソースを読み込むか」の判断であり、ツール呼び出しのサンドボックスではありません。また
        AGENTS.md の探索は信頼を必要としないため、内容は常にモデルに届きます。
      </Callout>

      <h2>変更を反映する</h2>
      <p>
        対話モードでは <code>/settings</code> でよく使う設定を変更できます。それ以外は Pi
        に「設定を変えて」と頼むか、ファイルを直接編集します。 手で編集したら <code>/reload</code>{" "}
        で読み直します。
      </p>
    </>
  );
}
