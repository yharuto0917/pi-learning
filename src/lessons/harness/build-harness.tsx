import { Callout } from "../../components/callout";
import { CodeBlock } from "../../components/code-block";
import { DataTable } from "../../components/data-table";
import { StepTracker } from "../../widgets/step-tracker";

const FINDINGS_TOOL = `import { StringEnum } from "@earendil-works/pi-ai";
import { defineTool } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

export interface Finding {
  file: string;
  line?: number;
  severity: "high" | "medium" | "low";
  message: string;
}

export const findings: Finding[] = [];

// モデルに「指摘を構造化して渡す」ための専用ツール
export const reportFinding = defineTool({
  name: "report_finding",
  label: "Report Finding",
  description: "レビューで見つけた問題を 1 件記録する。問題ごとに 1 回呼ぶ。",
  parameters: Type.Object({
    file: Type.String({ description: "リポジトリ相対パス" }),
    line: Type.Optional(Type.Number()),
    severity: StringEnum(["high", "medium", "low"] as const),
    message: Type.String({ description: "問題点と修正案" }),
  }),
  async execute(_toolCallId, params) {
    findings.push(params);
    return {
      content: [{ type: "text", text: \`記録しました（\${findings.length} 件目）\` }],
      details: params,
    };
  },
});`;

const LOADER = `import { realpathSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";

const REVIEW_POLICY = \`## レビューの方針
- 差分に含まれる変更だけを評価する
- 問題を見つけたら必ず report_finding を呼ぶ（本文に列挙しない）
- 推測ではなく、ファイルを読んで確かめた事実に基づく\`;

// 機密らしいファイル（.env*・.npmrc・.netrc・auth.json・秘密鍵・証明書など）と .git/ の中身。
// i に加えて u を付け、ſ（U+017F）や K（U+212A）のような Unicode の大文字小文字の対応も吸収する
const SECRET_FILE = /(^|\\/)(\\.env[^/]*|\\.npmrc|\\.netrc|auth\\.json|id_[a-z0-9]+|[^/]+\\.(pem|key|p12))$/iu;
const GIT_DIR = /(^|\\/)\\.git(\\/|$)/iu;
const PATH_TOOLS = new Set(["read", "grep", "find", "ls"]);

// 組み込みツールが受け付ける形式（先頭の @・~・file:// URL・絶対パス）をすべて同じように解釈する。
// 1 つでも解釈が違うと、ガードは「中」と判定し、ツールは「外」を読む、というすり抜けが起きる
function toAbsolute(root: string, input: string): string {
  const path = input.replace(/^@/, "");
  if (path === "~" || path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  if (path.startsWith("file://")) return resolve(fileURLToPath(path)); // %2E なども復号される
  return resolve(root, path);
}

// ファイルシステム上の本当のパスにそろえる。シンボリックリンクを解決し、大文字小文字を区別しない
// ファイルシステム（macOS など）では .GIT → .git のように実際の表記に直す。
// JS 版の realpathSync は表記を直さないので realpathSync.native を使う。存在しないパスはそのまま返す
function canonical(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

// root の中ならリポジトリ相対パスを、外なら undefined を返す
function toRelative(root: string, absolute: string): string | undefined {
  const rel = relative(root, absolute);
  if (rel === ".." || rel.startsWith(\`..\${sep}\`) || isAbsolute(rel)) return undefined;
  return rel.split(sep).join("/");
}

// grep の出力行（一致行「パス:行番号: 本文」、文脈行「パス-行番号- 本文」）が機密ファイルのものか。
// ディレクトリ名に区切りと同じ並びが含まれても取りこぼさないよう、区切りの候補ごとに判定する
function isSecretLine(line: string): boolean {
  for (const match of line.matchAll(/[:-]\\d+[:-] /g)) {
    const file = line.slice(0, match.index);
    if (SECRET_FILE.test(file) || GIT_DIR.test(file)) return true;
  }
  return false;
}

export async function createLoader(root: string) {
  const realRoot = canonical(root);
  const loader = new DefaultResourceLoader({
    cwd: root,
    agentDir: getAgentDir(),
    // リポジトリの AGENTS.md などは活かしつつ、方針を追記する
    appendSystemPromptOverride: (base) => [...base, REVIEW_POLICY],
    extensionFactories: [
      (pi) => {
        // 1. 実行前: レビュー対象の外（~/.pi/agent/auth.json など）と、機密らしいファイルを止める。
        //    read だけでなく、パスを受け取る grep・find・ls にも同じ制限をかける。
        //    このハンドラーが例外を投げた場合も、Pi はツールを実行しない
        pi.on("tool_call", async (event) => {
          if (!PATH_TOOLS.has(event.toolName)) return undefined;
          const input = event.input as { path?: string };
          const target = canonical(toAbsolute(root, input.path ?? "."));
          const rel = toRelative(realRoot, target);
          if (rel === undefined) {
            return { block: true, reason: \`レビュー対象の外（\${target}）にはアクセスできません\` };
          }
          if (SECRET_FILE.test(rel) || GIT_DIR.test(rel)) {
            return { block: true, reason: \`\${rel} は機密ファイルのため読めません\` };
          }
          return undefined;
        });

        // 2. 実行後: ディレクトリを grep すると、中にある機密ファイルの行も返るので取り除く。
        //    tool_result ハンドラーの例外はブロックにならない（結果がそのまま渡る）ので、投げない処理にとどめる
        pi.on("tool_result", async (event) => {
          if (event.toolName !== "grep") return undefined;
          const content = event.content.map((block) => {
            if (block.type !== "text") return block;
            const kept = block.text.split("\\n").filter((line) => !isSecretLine(line));
            return { ...block, text: kept.join("\\n") || "No matches found" };
          });
          return { content };
        });
      },
    ],
  });
  await loader.reload();
  return loader;
}`;

const MAIN = `import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { findings, reportFinding } from "./findings-tool";
import { createLoader } from "./loader";

// 使い方: npx tsx review-bot.ts <レビュー対象のリポジトリ> [比較元のブランチ]
const repo = resolve(process.argv[2] ?? ".");
const base = process.argv[3] ?? "origin/main";

// review-bot 自身のディレクトリではなく、レビュー対象のチェックアウトで差分を取る
const diff = execFileSync("git", ["diff", \`\${base}...HEAD\`], { cwd: repo, encoding: "utf-8" });
if (!diff.trim()) {
  console.log(JSON.stringify({ findings: [], summary: "差分がありません" }));
  process.exit(0);
}

const { session } = await createAgentSession({
  cwd: repo, // ツールのパス解決と AGENTS.md の探索をレビュー対象に合わせる
  resourceLoader: await createLoader(repo),
  // tools は許可リスト。読み取り系に絞り、customTools の名前も明示する
  tools: ["read", "grep", "find", "ls", "report_finding"],
  customTools: [reportFinding],
  sessionManager: SessionManager.inMemory(repo), // CI では履歴を残さない
});

// 進行状況は stderr へ（stdout は結果の JSON 専用にする）
session.subscribe((event) => {
  if (event.type === "tool_execution_start") {
    process.stderr.write(\`⚙ \${event.toolName} \${JSON.stringify(event.args)}\\n\`);
  }
});

let summary: string | undefined;
try {
  await session.prompt(\`次の差分をレビューしてください。\\n\\n\\\`\\\`\\\`diff\\n\${diff}\\n\\\`\\\`\\\`\`);
  summary = session.getLastAssistantText();
} finally {
  session.dispose();
}

console.log(JSON.stringify({ findings, summary }, null, 2));
process.exitCode = findings.some((f) => f.severity === "high") ? 1 : 0;`;

const TEST = `import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import { createModels, fauxAssistantMessage, fauxProvider, fauxToolCall } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { expect, it } from "vitest";

it("指摘が report_finding 経由で記録される", async () => {
  const recorded: unknown[] = [];
  const tool: AgentTool = {
    name: "report_finding",
    label: "Report Finding",
    description: "問題を 1 件記録する",
    parameters: Type.Object({ file: Type.String(), message: Type.String() }),
    async execute(_id, params) {
      recorded.push(params);
      return { content: [{ type: "text", text: "ok" }], details: params };
    },
  };

  const faux = fauxProvider();
  const models = createModels();
  models.setProvider(faux.provider);
  faux.setResponses([
    fauxAssistantMessage([fauxToolCall("report_finding", { file: "src/a.ts", message: "null チェック漏れ" })], {
      stopReason: "toolUse",
    }),
    fauxAssistantMessage("レビュー完了"),
  ]);

  const agent = new Agent({
    initialState: { systemPrompt: "You review code.", model: faux.getModel(), tools: [tool] },
    streamFn: models.streamSimple.bind(models),
  });
  await agent.prompt("レビューして");

  expect(recorded).toEqual([{ file: "src/a.ts", message: "null チェック漏れ" }]);
});`;

export function BuildHarnessLesson() {
  return (
    <>
      <h2>作るもの：CI 用レビュー・ハーネス</h2>
      <p>
        プルリクエストの差分を受け取り、リポジトリを<strong>読むだけ</strong>で調べ、指摘を JSON
        で出力し、重大な問題があれば CI を失敗させる——そんな小さなハーネスを SDK で組み立てます。CLI の{" "}
        <code>pi</code>{" "}
        では「書き込みを絶対にさせない」「指摘を構造化して受け取る」「終了コードで合否を返す」を同時に満たすのが難しいため、ハーネス化する価値があります。
      </p>
      <DataTable
        head={["要件", "実現方法"]}
        rows={[
          [
            "ファイルを書き換えない・コマンドを実行しない",
            <code key="a">tools: ["read", "grep", "find", "ls", "report_finding"]</code>,
          ],
          [
            "レビュー対象の外と機密ファイルに触れさせない",
            "tool_call で事前にブロックし、grep の結果からは tool_result で機密ファイルの行を除く",
          ],
          ["レビュー対象を指定する", "パスを引数で受け取り、git とセッションの作業ディレクトリにする"],
          [
            "指摘を構造化して受け取る",
            <span key="b">
              専用ツール <code>report_finding</code>（customTools）
            </span>,
          ],
          ["リポジトリのルールは尊重する", "DefaultResourceLoader ＋ 方針の追記"],
          ["CI に履歴を残さない", <code key="c">SessionManager.inMemory(repo)</code>],
          ["合否を返す", "high の指摘があれば exitCode = 1"],
        ]}
      />

      <StepTracker
        title="ハンズオン：review-bot を組み立てる"
        description="ステップを開いてコードを書き、できたら次へ進みます。"
        steps={[
          {
            title: "プロジェクトを用意する",
            body: (
              <>
                <CodeBlock
                  language="bash"
                  code={`mkdir review-bot && cd review-bot
npm init -y
npm pkg set type=module
npm install @earendil-works/pi-coding-agent @earendil-works/pi-ai typebox
npm install -D tsx vitest @earendil-works/pi-agent-core`}
                />
                <p>
                  review-bot はレビュー対象とは<strong>別のディレクトリ</strong>
                  に作り、対象リポジトリのパスを実行時に渡します。
                </p>
                <p>
                  モデルの認証は、開発機なら <code>pi</code> で <code>/login</code> 済みの{" "}
                  <code>~/.pi/agent/auth.json</code> が使われます。CI ではプロバイダーの環境変数（例:{" "}
                  <code>ANTHROPIC_API_KEY</code>）を設定します。
                </p>
              </>
            ),
          },
          {
            title: "指摘を受け取る専用ツールを作る",
            body: (
              <>
                <p>
                  モデルに自由文で列挙させると、後から解析するのが大変です。
                  <strong>構造化された引数を持つツール</strong>として渡せば、TypeBox のスキーマで検証された
                  データが手に入ります。
                </p>
                <CodeBlock language="ts" title="findings-tool.ts" code={FINDINGS_TOOL} />
              </>
            ),
          },
          {
            title: "リソースローダーで方針とガードを入れる",
            body: (
              <>
                <p>
                  <code>DefaultResourceLoader</code> を使うと、リポジトリの AGENTS.md
                  やスキルを活かしたまま一部だけ上書きできます。ガードはインライン拡張機能として渡します。
                </p>
                <CodeBlock language="ts" title="loader.ts" code={LOADER} />
                <Callout kind="warn" title="パスで判定するガードには限界がある">
                  これは多層防御の 1 枚です。このガードは、ツールと同じ入力形式（<code>file://</code> URL
                  など）を解釈し、
                  ファイルシステム上の本当のパス（シンボリックリンクの解決、大文字小文字の違い）にそろえて初めて機能します。Pi
                  はパス解決の関数を公開していないため、Pi
                  を更新したら解釈がずれていないか確かめてください。それでも、機密が別の名前でコミットされていれば防げませんし、
                  <code>find</code> や <code>ls</code> ではファイル名が見えます。Windows では NTFS
                  固有の表記（末尾のドットや代替データストリームなど）にも注意が必要です。さらに、エージェントのプロセスが参照できる環境変数（API
                  キーなど）は、コンテナの中でも読まれる可能性があります。確実に守るには、機密を置かない環境で必要最小限の権限だけを与えて動かします（公式ドキュメントの
                  Containerization を参照）。
                </Callout>
              </>
            ),
          },
          {
            title: "セッションを作って実行する",
            body: (
              <>
                <CodeBlock language="ts" title="review-bot.ts" code={MAIN} />
                <CodeBlock
                  language="bash"
                  code={"npx tsx review-bot.ts ../my-app origin/main > review.json"}
                />
                <Callout kind="tip">
                  stdout を結果専用にし、進行状況は stderr に出しています。CI
                  ではログとアーティファクトを分けて扱えます。
                </Callout>
              </>
            ),
          },
          {
            title: "faux プロバイダーでループをテストする",
            body: (
              <>
                <p>
                  本物のモデルを呼ぶテストは遅く、結果も揺れます。ツールのロジックとループの組み合わせは、pi-agent-core
                  と faux プロバイダーで決定的に検証できます。
                </p>
                <CodeBlock language="ts" title="review-bot.test.ts" code={TEST} />
              </>
            ),
          },
          {
            title: "CI に組み込む",
            body: (
              <>
                <CodeBlock
                  language="yaml"
                  title=".github/workflows/review.yml（抜粋）"
                  code={`# on: pull_request で実行する（github.base_ref は PR のイベントでだけ設定される）
# レビュー対象（この PR）と review-bot を別々のフォルダに取得する
- uses: actions/checkout@v4
  # persist-credentials: false で、.git/config にトークンを残さない
  with: { path: target, fetch-depth: 0, persist-credentials: false }
- uses: actions/checkout@v4
  with: { repository: your-name/review-bot, path: review-bot }
- uses: actions/setup-node@v4
  with: { node-version: 22 }
- run: npm ci --ignore-scripts
  working-directory: review-bot
- run: npx tsx review-bot.ts ../target origin/\${{ github.base_ref }} > review.json
  working-directory: review-bot
  env:
    ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}`}
                />
                <Callout kind="warn">
                  信頼できないフォークからのプルリクエストで秘密情報付きのジョブを動かさないこと。読み取り専用ツールでも、プロンプトインジェクションでモデルの振る舞いは変えられます。
                </Callout>
              </>
            ),
          },
        ]}
      />

      <h2>設計の振り返り</h2>
      <DataTable
        head={["判断", "理由", "別の選択肢"]}
        rows={[
          [
            "SDK（pi-coding-agent）を使う",
            "read / grep などの組み込みツール、AGENTS.md の探索、拡張機能をそのまま使える",
            "ツールも自作するなら pi-agent-core",
          ],
          [
            "権限はツール選択で絞る",
            "モデルに「書かないで」と頼むより、能力を持たせない方が確実",
            "拡張機能で write / edit をブロック",
          ],
          ["出力は専用ツールで受ける", "スキーマ検証された構造化データになる", "JSON モードでイベントを解析"],
          [
            "ガードは前後 2 段で、限界も明記する",
            "実行前のパス検査と実行後の結果の除去で取りこぼしを減らす。ただし名前による判定はすり抜けうる",
            "機密を置かないコンテナで実行する",
          ],
          ["インメモリのセッション", "CI に会話ファイルを残さない", "調査用に保存してアーティファクト化"],
          ["Node.js 以外の言語なら", "—", "pi --mode rpc を子プロセスで使う"],
        ]}
      />
      <Callout kind="note" title="さらに先へ">
        長時間のタスクを途中から再開したい、複数の会話やサブタスクを管理したい、といった要件では pi-durable
        が候補になります（実験的）。また、Pi のリポジトリの <code>examples/extensions/subagent</code> や{" "}
        <code>plan-mode</code> は、Pi があえて同梱しない機能を拡張機能で作る実例として参考になります。
      </Callout>
    </>
  );
}
