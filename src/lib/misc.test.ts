import { describe, expect, it } from "vitest";
import { generateExtension, toIdentifier } from "./extension-codegen";
import { walkChooser } from "./mechanism-chooser";
import { applyResourceFilter, globToRegExp } from "./package-filter";
import { loadProgress, parseProgress, saveProgress, toggleCompleted } from "./progress";
import { scoreQuiz } from "./quiz";
import { defaultSdkOptions, generateSdkCode } from "./sdk-codegen";
import { createTermState, extractAttachments, interpretInput } from "./terminal-sim";

describe("walkChooser", () => {
  it("コード不要・常時適用の指示は AGENTS.md", () => {
    const node = walkChooser([false, true]);
    expect(node.kind === "outcome" && node.mechanism).toBe("agents-md");
  });

  it("互換 API のモデルサービスは models.json", () => {
    const node = walkChooser([true, true, true]);
    expect(node.kind === "outcome" && node.mechanism).toBe("models-json");
  });

  it("途中の回答ではまだ質問ノード", () => {
    expect(walkChooser([true]).kind).toBe("question");
  });
});

describe("applyResourceFilter", () => {
  const paths = ["extensions/a.ts", "extensions/legacy.ts", "prompts/review.md", "skills/pdf/SKILL.md"];

  it("省略はすべて、空配列は何も読み込まない", () => {
    expect(applyResourceFilter(paths, undefined).enabled).toEqual(paths);
    expect(applyResourceFilter(paths, []).enabled).toEqual([]);
  });

  it("グロブと除外（ドキュメントの例）", () => {
    const result = applyResourceFilter(paths, ["extensions/*.ts", "!extensions/legacy.ts"]);
    expect(result.enabled).toEqual(["extensions/a.ts"]);
  });

  it("+path は除外より、-path は強制インクルードより優先される", () => {
    expect(applyResourceFilter(paths, ["!extensions/*", "+extensions/legacy.ts"]).enabled).toContain(
      "extensions/legacy.ts",
    );
    expect(applyResourceFilter(paths, ["+prompts/review.md", "-prompts/review.md"]).enabled).not.toContain(
      "prompts/review.md",
    );
  });

  it("SKILL.md は親ディレクトリでも完全一致する", () => {
    expect(applyResourceFilter(paths, ["-skills/pdf"]).enabled).not.toContain("skills/pdf/SKILL.md");
  });

  it("** は階層をまたぐ", () => {
    expect(globToRegExp("skills/**/SKILL.md").test("skills/a/b/SKILL.md")).toBe(true);
    expect(globToRegExp("extensions/*.ts").test("extensions/x/y.ts")).toBe(false);
  });
});

describe("progress", () => {
  it("壊れたデータは空として扱う", () => {
    expect(parseProgress("{bad")).toEqual({ completed: [] });
    expect(parseProgress(JSON.stringify({ completed: ["a", 1] }))).toEqual({ completed: ["a"] });
  });

  it("ストレージが例外を投げても落ちない", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadProgress(throwing)).toEqual({ completed: [] });
    expect(() => saveProgress(throwing, { completed: [] })).not.toThrow();
  });

  it("完了の切り替えは重複しない", () => {
    const once = toggleCompleted({ completed: [] }, "x", true);
    expect(toggleCompleted(once, "x", true).completed).toEqual(["x"]);
    expect(toggleCompleted(once, "x", false).completed).toEqual([]);
  });
});

describe("scoreQuiz", () => {
  const questions = [
    { id: "a", question: "", options: ["x", "y"], answer: 0, explanation: "" },
    { id: "b", question: "", options: ["x", "y"], answer: 1, explanation: "" },
    { id: "c", question: "", options: ["x", "y"], answer: 1, explanation: "" },
  ];

  it("7 割以上で合格", () => {
    expect(scoreQuiz(questions, { a: 0, b: 1, c: 1 }).passed).toBe(true);
    expect(scoreQuiz(questions, { a: 0, b: 1, c: 0 }).passed).toBe(false);
  });
});

describe("codegen", () => {
  it("拡張機能のコードは選んだ API だけを含む", () => {
    const { code, apis } = generateExtension({
      tool: false,
      toolName: "",
      command: true,
      commandName: "Hi There",
      guard: true,
      status: false,
      systemPrompt: false,
      systemPromptText: "",
      lifecycle: false,
    });
    expect(code).toContain('pi.registerCommand("hi_there"');
    expect(code).toContain('pi.on("tool_call"');
    expect(code).not.toContain("typebox");
    expect(apis).toContain("pi.registerCommand()");
  });

  it("toIdentifier は空ならフォールバック", () => {
    expect(toIdentifier("!!!", "x")).toBe("x");
  });

  it("SDK コードは in-memory と読み取り専用ツールを反映する", () => {
    const code = generateSdkCode(defaultSdkOptions);
    expect(code).toContain("SessionManager.inMemory()");
    expect(code).toContain('tools: ["read","grep","find","ls"]');
    expect(code).toContain("session.dispose()");
  });

  it("tools は許可リストなので customTools の名前も含める", () => {
    const code = generateSdkCode({ ...defaultSdkOptions, customTool: true });
    expect(code).toContain('tools: ["read","grep","find","ls","release_notes"]');
  });

  it('ツールなしは noTools: "builtin" で customTools を残す', () => {
    const code = generateSdkCode({ ...defaultSdkOptions, tools: "none", customTool: true });
    expect(code).toContain('noTools: "builtin"');
    expect(code).not.toContain("tools: [");
  });

  it("full-control では探索しない ResourceLoader を使い、ガードは出力しない", () => {
    const code = generateSdkCode({ ...defaultSdkOptions, resources: "full-control", guard: true });
    expect(code).toContain("createExtensionRuntime");
    expect(code).not.toContain("extensionFactories");
  });
});

describe("terminal-sim", () => {
  it("ログイン前のプロンプトはエラー", () => {
    const result = interpretInput(createTermState(), "こんにちは");
    expect(result.run).toBeUndefined();
  });

  it("! の出力はコンテキストに入り、!! は入らない", () => {
    const state = createTermState();
    expect(interpretInput(state, "!git status").state.contextItems).toHaveLength(1);
    expect(interpretInput(state, "!!git status").state.contextItems).toHaveLength(0);
  });

  it("@path を添付として取り出す", () => {
    expect(extractAttachments("要約して @README.md と @src/index.ts")).toEqual(["README.md", "src/index.ts"]);
  });

  it("ログイン後は実行が始まる", () => {
    const loggedIn = interpretInput(createTermState(), "/login").state;
    expect(interpretInput(loggedIn, "@README.md を要約して").run?.attachments).toEqual(["README.md"]);
  });
});
