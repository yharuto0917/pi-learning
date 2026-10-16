// createAgentSession() を使う独自ハーネスの雛形コードを生成する

export type ResourceMode = "default" | "append-prompt" | "full-control";
export type SessionMode = "persistent" | "memory";
export type ToolPreset = "default" | "read-only" | "none";

export interface SdkOptions {
  resources: ResourceMode;
  sessions: SessionMode;
  tools: ToolPreset;
  customTool: boolean;
  guard: boolean;
  streaming: boolean;
  pickAvailableModel: boolean;
}

export const defaultSdkOptions: SdkOptions = {
  resources: "default",
  sessions: "memory",
  tools: "read-only",
  customTool: false,
  guard: false,
  streaming: true,
  pickAvailableModel: false,
};

export const CUSTOM_TOOL_NAME = "release_notes";

export const toolPresets: Record<ToolPreset, string[]> = {
  default: ["read", "bash", "edit", "write"],
  "read-only": ["read", "grep", "find", "ls"],
  none: [],
};

/** full-control では拡張機能を読み込まないため、ガードは使えない */
export function isGuardAvailable(options: SdkOptions): boolean {
  return options.resources !== "full-control";
}

export function generateSdkCode(options: SdkOptions): string {
  const coreImports = new Set<string>(["createAgentSession"]);
  const pieces: string[] = [];
  const sessionArgs: string[] = [];
  const guard = options.guard && isGuardAvailable(options);

  if (options.sessions === "memory") coreImports.add("SessionManager");
  if (options.customTool) coreImports.add("defineTool");

  if (options.pickAvailableModel) {
    coreImports.add("ModelRuntime");
    pieces.push(`// 認証情報が使えるモデルの中から選ぶ
const modelRuntime = await ModelRuntime.create();
const [model] = await modelRuntime.getAvailable();
if (!model) throw new Error("利用可能なモデルがありません。pi で /login してください");`);
    sessionArgs.push("  modelRuntime,", "  model,", '  thinkingLevel: "medium",');
  }

  if (options.customTool) {
    pieces.push(`// ハーネス固有のツール。customTools で組み込みツールに追加する
const releaseNotesTool = defineTool({
  name: "release_notes",
  label: "Release Notes",
  description: "リリースノートの下書きを保存する",
  parameters: Type.Object({
    markdown: Type.String({ description: "保存する Markdown" }),
  }),
  async execute(_toolCallId, params) {
    await writeFile("RELEASE_NOTES.md", params.markdown);
    return { content: [{ type: "text", text: "RELEASE_NOTES.md を保存しました" }], details: undefined };
  },
});`);
    sessionArgs.push("  customTools: [releaseNotesTool],");
  }

  if (options.resources === "full-control") {
    coreImports.add("createExtensionRuntime");
    coreImports.add("type ResourceLoader");
    pieces.push(`// 探索を一切しない ResourceLoader。プロンプトもリソースもホストが所有する
const resourceLoader: ResourceLoader = {
  getExtensions: () => ({ extensions: [], errors: [], runtime: createExtensionRuntime() }),
  getSkills: () => ({ skills: [], diagnostics: [] }),
  getPrompts: () => ({ prompts: [], diagnostics: [] }),
  getThemes: () => ({ themes: [], diagnostics: [] }),
  getAgentsFiles: () => ({ agentsFiles: [] }),
  getSystemPrompt: () => "あなたはリリース準備を手伝うアシスタントです。簡潔に答えてください。",
  getSystemPromptSource: () => undefined,
  getAppendSystemPrompt: () => [],
  getAppendSystemPromptSources: () => [],
  extendResources: () => {},
  reload: async () => {},
};`);
    sessionArgs.push("  resourceLoader,");
  } else if (options.resources === "append-prompt" || guard) {
    coreImports.add("DefaultResourceLoader");
    coreImports.add("getAgentDir");
    const loaderLines = ["  cwd: process.cwd(),", "  agentDir: getAgentDir(),"];
    if (options.resources === "append-prompt") {
      loaderLines.push(`  // 既定のシステムプロンプトに指示を追加する
  appendSystemPromptOverride: (base) => [...base, "## ハーネスの方針\\n- 変更前に必ず計画を示す"],`);
    }
    if (guard) {
      loaderLines.push(`  // インライン拡張機能: ツール呼び出しを実行前に検査する
  extensionFactories: [
    (pi) => {
      pi.on("tool_call", async (event) => {
        if (event.toolName === "bash" && /\\brm\\s+-rf\\b/.test(String(event.input.command))) {
          return { block: true, reason: "rm -rf はこのハーネスでは禁止です" };
        }
        return undefined;
      });
    },
  ],`);
    }
    pieces.push(`// 標準の探索（AGENTS.md・スキル・拡張機能など）を使いつつ一部だけ上書きする
const resourceLoader = new DefaultResourceLoader({
${loaderLines.join("\n")}
});
await resourceLoader.reload();`);
    sessionArgs.push("  resourceLoader,");
  }

  if (options.tools === "none") {
    // 組み込みツールだけを外し、customTools や拡張機能のツールは残す
    sessionArgs.push('  noTools: "builtin",');
  } else if (options.tools !== "default") {
    // tools は許可リスト。customTools も名前を含めないと有効にならない
    const allowed = [...toolPresets[options.tools], ...(options.customTool ? [CUSTOM_TOOL_NAME] : [])];
    sessionArgs.push(`  tools: ${JSON.stringify(allowed)},`);
  }

  if (options.sessions === "memory") {
    sessionArgs.push(
      "  // セッションファイルを作らない（実行が終われば履歴は消える）",
      "  sessionManager: SessionManager.inMemory(),",
    );
  }

  const createCall =
    sessionArgs.length === 0
      ? "const { session } = await createAgentSession();"
      : `const { session } = await createAgentSession({\n${sessionArgs.join("\n")}\n});`;
  pieces.push(createCall);

  const run: string[] = ["try {"];
  if (options.streaming) {
    run.push(`  // prompt() の前に購読して、ストリーミング出力を受け取る
  session.subscribe((event) => {
    if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
      process.stdout.write(event.assistantMessageEvent.delta);
    }
  });`);
  }
  run.push('  await session.prompt("直近の変更を要約してリリースノートを書いて");');
  if (!options.streaming) run.push("  console.log(session.getLastAssistantText());");
  run.push(
    "} finally {",
    "  // 実行中の処理を止め、拡張機能のコンテキストとリスナーを破棄する",
    "  session.dispose();",
    "}",
  );
  pieces.push(run.join("\n"));

  const imports: string[] = [];
  if (options.customTool) {
    imports.push('import { writeFile } from "node:fs/promises";', 'import { Type } from "typebox";');
  }
  const sortedCore = [...coreImports].sort((a, b) =>
    a.replace("type ", "").localeCompare(b.replace("type ", "")),
  );
  imports.push(`import {\n  ${sortedCore.join(",\n  ")},\n} from "@earendil-works/pi-coding-agent";`);

  return `${imports.join("\n")}\n\n${pieces.join("\n\n")}\n`;
}
