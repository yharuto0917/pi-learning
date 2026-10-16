import { Callout } from "../../components/callout";
import { DataTable } from "../../components/data-table";
import { MechanismChooser } from "../../widgets/mechanism-chooser";

export function ChooseMechanismLesson() {
  return (
    <>
      <h2>原則：いちばん小さな仕組みから</h2>
      <p>
        Pi のカスタマイズ手段は、「ただの文章」から「プロセス内で動く
        TypeScript」まで強さが段階的に違います。強い仕組みほど何でもできますが、
        保守の手間とセキュリティ上の影響も大きくなります。公式ドキュメントは
        <strong>要件を満たす最も弱い仕組みから始める</strong>ことを勧めています。
      </p>
      <DataTable
        head={["やりたいこと", "まず使うもの", "強さ"]}
        rows={[
          ["フォルダで常に従ってほしい指示", <code key="a">AGENTS.md</code>, "文章"],
          ["よく使うプロンプトを / メニューから再利用", "プロンプトテンプレート", "文章 ＋ 引数"],
          ["特定作業の手順書と補助ファイル", "スキル", "文章 ＋ スクリプト"],
          ["ツール・コマンド・イベント処理を追加", "拡張機能", "コード"],
          ["独自のターミナル UI コンポーネント", "拡張機能 ＋ Terminal UI", "コード"],
          ["未対応のモデルサービスに接続", "models.json／カスタムプロバイダー", "設定／コード"],
          ["複数のリソースを配布・インストール", "Pi パッケージ", "配布形式"],
        ]}
      />
      <MechanismChooser />
      <Callout kind="tip" title="迷ったら Pi に聞く">
        Pi
        は自分自身のドキュメントを知っています。「このリポジトリのコミット前チェックを自動化したい。どの仕組みがいい？」と尋ねれば、提案と実装まで進めてくれます。
      </Callout>
      <Callout kind="warn" title="どの仕組みも“信頼”が前提">
        プロジェクトの <code>.pi/</code>{" "}
        にあるテンプレート・スキル・拡張機能は、プロジェクトを信頼したあとに読み込まれます。スキルはモデルにスクリプト実行を指示でき、拡張機能は
        Pi のプロセス内で動きます。見知らぬリポジトリでは中身を確認してから信頼しましょう。
      </Callout>
    </>
  );
}
