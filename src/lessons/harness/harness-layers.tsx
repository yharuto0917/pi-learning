import { Callout } from "../../components/callout";
import { DataTable } from "../../components/data-table";
import { LayerDiagram } from "../../widgets/layer-diagram";

export function HarnessLayersLesson() {
  return (
    <>
      <h2>カスタマイズと「独自ハーネス」の違い</h2>
      <div className="compare">
        <div>
          <h4>第 2 部：カスタマイズ</h4>
          <code>pi</code> コマンドという完成品の中に、拡張機能やスキルを差し込んで振る舞いを変える。Pi
          のプロセス・UI・セッション管理はそのまま使う。
        </div>
        <div>
          <h4>第 3 部：独自ハーネス</h4>
          Pi を構成するパッケージを<strong>部品として</strong>使い、自分のアプリ・サービス・CI
          の中で動く別のエージェントを組み立てる。UI も永続化も入口も自分で決める。
        </div>
      </div>
      <p>
        Pi の README には、実際の組み込み例として OpenClaw が挙げられています。Slack
        やチャットでの自動化には別リポジトリの pi-chat があります。どちらも「Pi
        の部品の上に作られた別のハーネス」です。
      </p>

      <h2>レイヤーを見る</h2>
      <LayerDiagram />

      <h2>どの層から組むか</h2>
      <DataTable
        head={["要件", "おすすめの入口"]}
        rows={[
          ["既存の Pi をスクリプトから 1 回呼びたい", "print / JSON モード"],
          ["別言語のアプリから Pi を常駐させて制御したい", "RPC モード（プロセス分離）"],
          ["Node.js / Bun アプリに Pi の全機能を組み込みたい", <code key="a">createAgentSession()</code>],
          [
            "コーディング以外の独自エージェントを最小部品で作りたい",
            <code key="b">pi-agent-core の Agent</code>,
          ],
          ["ループも自作し、モデル呼び出しだけ統一したい", <code key="c">pi-ai</code>],
        ]}
      />
      <Callout kind="tip" title="上の層から試し、足りなくなったら降りる">
        まずは SDK で <code>tools</code> や <code>resourceLoader</code>{" "}
        を差し替えるだけで済まないか確認しましょう。セッションのツリー保存、コンパクション、拡張機能、スキルといった
        Pi の資産をそのまま使えます。それでも合わないときに pi-agent-core、pi-ai へ降ります。
      </Callout>
      <Callout kind="note" title="pi-durable について">
        プロセスが途中で落ちても再開できる「耐久性のあるハーネス」として pi-durable
        も公開されていますが、README で実験的（API
        は予告なく変更）と明記されています。本講座では紹介にとどめます。
      </Callout>
    </>
  );
}
