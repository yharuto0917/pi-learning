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

const LOADER = `import { DefaultResourceLoader, getAgentDir } from "@earendil-works/pi-coding-agent";

const REVIEW_POLICY = \`## レビューの方針
- 差分に含まれる変更だけを評価する
- 問題を見つけたら必ず report_finding を呼ぶ（本文に列挙しない）
- 推測ではなく、ファイルを読んで確かめた事実に基づく\`;

export async function createLoader() {
  const loader = new DefaultResourceLoader({
    cwd: process.cwd(),
    agentDir: getAgentDir(),
    // リポジトリの AGENTS.md などは活かしつつ、方針を追記する
    appendSystemPromptOverride: (base) => [...base, REVIEW_POLICY],
    extensionFactories: [
      (pi) => {
        // 機密ファイルは読ませない（tool_call は失敗時もブロック側に倒れる）
        pi.on("tool_call", async (event) => {
          const path = String(event.input.path ?? "");
          if (/(^|\\/)\\.env|\\.pem$|id_rsa/.test(path)) {
            return { block: true, reason: \`\${path} は機密ファイルのため読めません\` };
          }
          return undefined;
        });
      },
    ],
  });
  await loader.reload();
  return loader;
}`;

const MAIN = `import { execSync } from "node:child_process";
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";
import { findings, reportFinding } from "./findings-tool";
import { createLoader } from "./loader";

const diff = execSync("git diff origin/main...HEAD", { encoding: "utf-8" });

const { session } = await createAgentSession({
  resourceLoader: await createLoader(),
  // tools は許可リスト。読み取り系に絞り、customTools の名前も明示する
  tools: ["read", "grep", "find", "ls", "report_finding"],
  customTools: [reportFinding],
  sessionManager: SessionManager.inMemory(), // CI では履歴を残さない
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
          ["機密ファイルを読ませない", "インライン拡張機能の tool_call でブロック"],
          [
            "指摘を構造化して受け取る",
            <span key="b">
              専用ツール <code>report_finding</code>（customTools）
            </span>,
          ],
          ["リポジトリのルールは尊重する", "DefaultResourceLoader ＋ 方針の追記"],
          ["CI に履歴を残さない", <code key="c">SessionManager.inMemory()</code>],
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
              </>
            ),
          },
          {
            title: "セッションを作って実行する",
            body: (
              <>
                <CodeBlock language="ts" title="review-bot.ts" code={MAIN} />
                <CodeBlock language="bash" code={"npx tsx review-bot.ts > review.json"} />
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
                  code={`- uses: actions/checkout@v4
  with: { fetch-depth: 0 }
- uses: actions/setup-node@v4
  with: { node-version: 22 }
- run: npm ci --ignore-scripts
- run: npx tsx review-bot.ts > review.json
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
