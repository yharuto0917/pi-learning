import { useState } from "react";
import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { SegmentedControl } from "../../components/segmented-control";
import { TerminalSimulator } from "../../widgets/terminal-simulator";

const INSTALLERS = {
  installer: {
    label: "インストーラー",
    code: "curl -fsSL https://pi.dev/install.sh | sh",
    note: "依存関係をピン留めしてインストールし、以後は pi update で更新できます。必要なら Node.js も入れてくれます。",
  },
  npm: {
    label: "npm",
    code: "npm install -g --ignore-scripts @earendil-works/pi-coding-agent",
    note: "Node.js 22.19 以上が必要です。推移的な依存はピン留めされません。ライフサイクルスクリプトは不要なので --ignore-scripts を付けます。",
  },
  windows: {
    label: "Windows",
    code: 'powershell -c "irm https://pi.dev/install.ps1 | iex"',
    note: "PowerShell からインストールします。ネイティブ Windows の詳細は公式の Windows Setup を参照してください。",
  },
  nix: {
    label: "Nix",
    code: "nix profile add github:earendil-works/pi/stable",
    note: "ソースからビルドされます。更新は nix profile upgrade pi（pi update は使えません）。",
  },
} as const;

type InstallerId = keyof typeof INSTALLERS;

export function FirstRunLesson() {
  const [installer, setInstaller] = useState<InstallerId>("installer");
  const current = INSTALLERS[installer];

  return (
    <>
      <h2>1. インストール</h2>
      <p>
        環境に合った方法を選んでください。どの方法でも、最後に <code>pi --version</code> で確認できます。
      </p>
      <SegmentedControl
        label="インストール方法"
        value={installer}
        options={(Object.keys(INSTALLERS) as InstallerId[]).map((id) => ({
          value: id,
          label: INSTALLERS[id].label,
        }))}
        onChange={setInstaller}
      />
      <div style={{ marginTop: 12 }}>
        <CodeBlock code={current.code} language="bash" />
      </div>
      <p className="muted" style={{ fontSize: 14 }}>
        {current.note}
      </p>

      <h2>2. 作業フォルダで起動する</h2>
      <p>
        Pi は<strong>起動したフォルダ</strong>を作業場所として扱います。ファイルの探索、AGENTS.md
        などの指示の読み込み、セッションのグループ分けがこのフォルダ基準で行われます。
      </p>
      <CodeBlock code={"cd /path/to/project\npi"} language="bash" />
      <p>
        画面には会話（トランスクリプト）、プロンプトを書くエディター、そして現在のフォルダ・モデル・コンテキスト使用量・コストを表示するフッターが並びます。初回はフォルダを信頼するか尋ねられることがあります。
      </p>

      <h2>3. モデルを選ぶ</h2>
      <p>
        <strong>モデル</strong>は応答を生成するもの、<strong>プロバイダー</strong>
        はそのモデルにアクセスするためのサービスやアカウントです。
      </p>
      <DataTable
        head={["持っているもの", "おすすめの設定"]}
        rows={[
          ["対応しているサブスクリプション", <code key="a">/login</code>],
          [
            "プロバイダーの API キー",
            <span key="b">
              <code>/login</code> または環境変数
            </span>,
          ],
          ["ローカルの GGUF モデル", "llama.cpp ルーターに接続（/llama）"],
          ["OpenAI / Anthropic / Google 互換エンドポイント", <code key="c">~/.pi/agent/models.json</code>],
          ["独自プロトコル・認証のサービス", "プロバイダー拡張機能を作る／入れる"],
        ]}
      />
      <p>
        認証情報は <code>~/.pi/agent/auth.json</code> に保存されます。<code>/model</code>（または{" "}
        <kbd>Ctrl</kbd>+<kbd>L</kbd>
        ）でモデルを選び、<kbd>Ctrl</kbd>+<kbd>S</kbd> で新しいセッションの既定に保存できます。
      </p>
      <Callout kind="note" title="認証情報の優先順位">
        実行時の <code>--api-key</code> → <code>auth.json</code> の保存済み認証 → <code>models.json</code> の{" "}
        <code>apiKey</code> → プロバイダーの環境変数、の順に使われます。CI では環境変数を使うと、Pi
        が認証情報をファイルに書き込みません。
      </Callout>

      <h2>4. 最初のタスクを依頼する</h2>
      <p>
        Pi はファイルの読み取り・検索・コマンド実行・編集を、そのつど画面に表示しながら進めます。
        <strong>ツール呼び出しのたびに許可を求めることはしません</strong>
        。終わったら応答と変更されたファイルを確認しましょう。大事な作業はバージョン管理やバックアップと一緒に。
      </p>
      <TerminalSimulator
        title="はじめての Pi"
        hint="ログインしてモデルを選び、ファイルを添付してタスクを依頼してみましょう。/ を入力するとコマンド候補が出ます。"
        missions={[
          { id: "login", label: "/login でプロバイダーに接続する" },
          { id: "model", label: "/model gpt のようにモデルを切り替える" },
          {
            id: "attach",
            label:
              "@ でファイルを添付して依頼する（例: @meeting-notes.md の要点を action-items.md に保存して）",
          },
          { id: "session", label: "/session でセッション情報を確認する" },
        ]}
      />

      <h2>5. あとで続きから</h2>
      <p>セッションは自動保存されます。同じフォルダで次のように起動すると、続きから再開できます。</p>
      <CodeBlock
        code={"pi --continue   # 直前のセッションを再開（-c）\npi --resume     # 一覧から選ぶ（-r）"}
        language="bash"
      />
    </>
  );
}
