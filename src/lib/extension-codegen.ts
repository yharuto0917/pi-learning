// 選んだ機能から Pi 拡張機能（ExtensionAPI）のコードを生成する

export interface ExtensionOptions {
  tool: boolean;
  toolName: string;
  command: boolean;
  commandName: string;
  guard: boolean;
  status: boolean;
  systemPrompt: boolean;
  systemPromptText: string;
  lifecycle: boolean;
}

export const defaultExtensionOptions: ExtensionOptions = {
  tool: true,
  toolName: "word_count",
  command: true,
  commandName: "hello",
  guard: false,
  status: false,
  systemPrompt: false,
  systemPromptText: "回答は必ず日本語で、結論から書いてください。",
  lifecycle: false,
};

/** ツール名・コマンド名として安全な識別子に整える */
export function toIdentifier(value: string, fallback: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "");
  return cleaned || fallback;
}

function escapeTemplate(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
}

export interface GeneratedExtension {
  code: string;
  apis: string[];
}

export function generateExtension(options: ExtensionOptions): GeneratedExtension {
  const apis: string[] = [];
  const blocks: string[] = [];
  const toolName = toIdentifier(options.toolName, "my_tool");
  const commandName = toIdentifier(options.commandName, "hello");

  if (options.lifecycle) {
    apis.push('pi.on("session_start")', 'pi.on("session_shutdown")');
    blocks.push(`  // ファクトリーではタイマーやプロセスを起動しない。session_start で始めて session_shutdown で止める
  let timer: ReturnType<typeof setInterval> | undefined;

  pi.on("session_start", async () => {
    timer = setInterval(() => {
      // 定期処理
    }, 60_000);
  });

  pi.on("session_shutdown", async () => {
    // 複数の経路から呼ばれても安全なように冪等にする
    if (timer) clearInterval(timer);
    timer = undefined;
  });`);
  }

  if (options.tool) {
    apis.push("pi.registerTool()");
    blocks.push(`  // モデルが呼び出せるツール。parameters は TypeBox のスキーマ
  pi.registerTool({
    name: "${toolName}",
    label: "${toolName}",
    description: "テキストの文字数と行数を数える",
    parameters: Type.Object({
      text: Type.String({ description: "数える対象のテキスト" }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, _ctx) {
      const lines = params.text.split("\\n").length;
      return {
        // content はモデルに渡り、details はレンダリングや状態の復元に使う
        content: [{ type: "text", text: \`\${params.text.length} 文字 / \${lines} 行\` }],
        details: { chars: params.text.length, lines },
      };
    },
  });`);
  }

  if (options.command) {
    apis.push("pi.registerCommand()");
    blocks.push(`  // エディターで /${commandName} と入力すると実行される
  pi.registerCommand("${commandName}", {
    description: "あいさつを表示する",
    handler: async (args, ctx) => {
      ctx.ui.notify(\`こんにちは、\${args || "world"}!\`, "info");
    },
  });`);
  }

  if (options.guard) {
    apis.push('pi.on("tool_call")');
    blocks.push(`  // 危険な bash コマンドの実行前に確認する
  const dangerous = [/\\brm\\s+(-rf?|--recursive)/i, /\\bsudo\\b/i];

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "bash") return undefined;
    const command = event.input.command as string;
    if (!dangerous.some((pattern) => pattern.test(command))) return undefined;

    // print / JSON モードには UI がないので、既定でブロックする
    if (!ctx.hasUI) return { block: true, reason: "確認できないためブロックしました" };

    const ok = await ctx.ui.confirm("危険なコマンドを実行しますか？", command);
    return ok ? undefined : { block: true, reason: "ユーザーが拒否しました" };
  });`);
  }

  if (options.status) {
    apis.push('pi.on("turn_start")', 'pi.on("turn_end")', "ctx.ui.setStatus()");
    blocks.push(`  // フッターにターン数を表示する
  let turns = 0;

  pi.on("turn_start", async (_event, ctx) => {
    turns++;
    ctx.ui.setStatus("turns", ctx.ui.theme.fg("accent", \`● ターン \${turns}\`));
  });

  pi.on("turn_end", async (_event, ctx) => {
    ctx.ui.setStatus("turns", ctx.ui.theme.fg("dim", \`✓ ターン \${turns} 完了\`));
  });`);
  }

  if (options.systemPrompt) {
    apis.push('pi.on("before_agent_start")');
    const text = escapeTemplate(options.systemPromptText.trim() || "追加の指示");
    blocks.push(`  // 実行ごとにシステムプロンプトへ指示を足す（systemPrompt を返すとその実行のプロンプト全体を置き換える）
  pi.on("before_agent_start", async (event) => {
    return {
      systemPrompt: \`\${event.systemPrompt}

## 追加の指示
${text}\`,
    };
  });`);
  }

  const imports = [];
  if (options.tool) imports.push('import { Type } from "typebox";');
  imports.push('import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";');

  const body = blocks.length > 0 ? blocks.join("\n\n") : "  // 機能を選ぶとここにコードが追加されます";
  const code = `${imports.join("\n")}\n\nexport default function (pi: ExtensionAPI) {\n${body}\n}\n`;
  return { code, apis };
}
