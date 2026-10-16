import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { PackageFilterPlayground } from "../../widgets/package-filter-playground";

export function ThemesPackagesLesson() {
  return (
    <>
      <h2>テーマ</h2>
      <p>
        テーマは対話モードと HTML エクスポートの配色を決めます。組み込みは <code>system</code>（既定）・
        <code>dark</code>・<code>light</code> の 3 つ。<code>system</code> はターミナルの前景色・背景色・ANSI
        16 色を問い合わせ、本文が背景に対して WCAG 4.5:1 以上のコントラストになるよう色を組み立てます。
      </p>
      <CodeBlock language="json" title="settings.json" code={`{\n  "theme": "light/dark"\n}`} />
      <p>
        <code>"light/dark"</code> のように書くと、ターミナルが明るいか暗いかで自動的に切り替わります。1
        回だけ試すなら <code>pi --use-theme light</code>。
      </p>
      <h3>カスタムテーマを作る</h3>
      <ol>
        <li>
          組み込みテーマをコピーするか、スキーマ（<code>https://pi.dev/schemas/theme.schema.json</code>
          ）に沿った JSON を作る
        </li>
        <li>
          <code>~/.pi/agent/themes/my-theme.json</code> に保存し、<code>name</code> を <code>my-theme</code>{" "}
          にする
        </li>
        <li>
          <code>vars</code>（再利用する色）と <code>colors</code>（UI の役割ごとの色）を調整する
        </li>
        <li>
          <code>/settings</code> で選ぶ（このパスのアクティブなテーマはホットリロードされる）
        </li>
      </ol>

      <h2>Pi パッケージ</h2>
      <p>
        パッケージは、拡張機能・スキル・プロンプトテンプレート・テーマを<strong>ひとまとめにして配布</strong>
        する単位です。中身は普通のディレクトリ／npm パッケージです。
      </p>
      <CodeBlock
        language="bash"
        title="インストールと管理"
        code={`pi install npm:@example/pi-tools@1.0.0
pi install git:github.com/example/pi-tools@v1
pi install ./local-package
pi install -l npm:@example/pi-tools   # プロジェクトの .pi/settings.json に書く
pi -e npm:@example/pi-tools           # 設定に追加せず 1 回だけ試す
pi list
pi remove npm:@example/pi-tools
pi config                             # 読み込むリソースを有効化／無効化`}
      />
      <DataTable
        head={["ソース", "例", "振る舞い"]}
        rows={[
          [
            "npm",
            <code key="a">npm:@example/pi-tools@1.0.0</code>,
            "Pi の npm ディレクトリにインストール。バージョン指定でピン留め",
          ],
          ["git", <code key="b">git:github.com/example/pi-tools@v1</code>, "クローンして指定 ref に合わせる"],
          ["URL", <code key="c">https://github.com/example/pi-tools</code>, "git ソースとして扱う"],
          ["ローカル", <code key="d">./pi-tools</code>, "コピーせずそのパスから読み込む"],
        ]}
      />

      <h3>パッケージを作る</h3>
      <CodeBlock
        language="json"
        title="package.json"
        code={`{
  "name": "my-pi-package",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./src/extension.ts"],
    "skills": ["./resources/skills"],
    "prompts": ["./resources/prompts/*.md"],
    "themes": ["./resources/themes/*.json"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "typebox": "*"
  }
}`}
      />
      <p>
        <code>pi</code> マニフェストを省略すると、<code>extensions/</code>・<code>skills/</code>・
        <code>prompts/</code>・<code>themes/</code> の規定ディレクトリから探索されます。<code>keywords</code>{" "}
        に <code>pi-package</code> を入れると{" "}
        <a href="https://pi.dev/packages" target="_blank" rel="noreferrer">
          パッケージギャラリー
        </a>
        の対象になります。
      </p>
      <Callout kind="warn" title="Pi 本体のパッケージはバンドルしない">
        <code>@earendil-works/pi-ai</code>・<code>pi-agent-core</code>・<code>pi-coding-agent</code>・
        <code>pi-tui</code>・<code>typebox</code> は Pi が提供します。<code>peerDependencies</code> に{" "}
        <code>"*"</code> で宣言し、<code>dependencies</code>{" "}
        には入れません。実体が複製されると、クラスやレジストリが重複してしまいます。
      </Callout>

      <h2>読み込むリソースを絞る</h2>
      <p>
        settings.json の <code>packages</code>{" "}
        にオブジェクト形式で書くと、パッケージの中から読み込むものを選べます。省略はすべて、空配列は何も読み込まない、という意味です。
      </p>
      <PackageFilterPlayground />
      <p>
        同じパッケージがユーザー設定とプロジェクト設定の両方にある場合、通常はプロジェクト側のエントリーが置き換えます。npm
        はパッケージ名、git は ref を除いたリポジトリ
        URL、ローカルは絶対パスで同一性を判定するので、同じものが二重に読み込まれることはありません。
      </p>
    </>
  );
}
