import { describe, expect, it } from "vitest";
import { expandTemplate, parseCommandArgs, parseFrontmatter, substituteArgs } from "./template-expander";

describe("parseCommandArgs", () => {
  it("空白で分割し、クォート内の空白を保持する", () => {
    expect(parseCommandArgs("a \"b c\" 'd e'")).toEqual(["a", "b c", "d e"]);
  });

  it("空のクォートも引数として残す", () => {
    expect(parseCommandArgs('"" x')).toEqual(["", "x"]);
  });

  it("連続する空白は無視する", () => {
    expect(parseCommandArgs("  a   b  ")).toEqual(["a", "b"]);
  });
});

describe("substituteArgs", () => {
  const args = ["one", "two", "three"];

  it("位置引数と全引数を置換する", () => {
    expect(substituteArgs("$1-$2 [$@] [$ARGUMENTS]", args)).toBe("one-two [one two three] [one two three]");
  });

  it("存在しない位置引数は空文字になる", () => {
    expect(substituteArgs("[$5]", args)).toBe("[]");
  });

  it("デフォルト値は引数がないか空のときに使う", () => {
    expect(substituteArgs("${1:-x} ${4:-fallback}", args)).toBe("one fallback");
    expect(substituteArgs("${@:-none}", [])).toBe("none");
    expect(substituteArgs("${1:-empty}", [""])).toBe("empty");
  });

  it("${@:N} と ${@:N:L} でスライスする（1 始まり、0 は 1 扱い）", () => {
    expect(substituteArgs("${@:2}", args)).toBe("two three");
    expect(substituteArgs("${@:1:2}", args)).toBe("one two");
    expect(substituteArgs("${@:0:1}", args)).toBe("one");
  });

  it("置換後の値を再帰的に展開しない", () => {
    expect(substituteArgs("$1", ["$2", "nope"])).toBe("$2");
  });
});

describe("parseFrontmatter / expandTemplate", () => {
  const template = `---
description: Review staged git changes
argument-hint: "[focus]"
---
Review the staged changes. Focus on \${1:-correctness}.`;

  it("フロントマターを読み、クォートを外す", () => {
    const { frontmatter, body } = parseFrontmatter(template);
    expect(frontmatter.description).toBe("Review staged git changes");
    expect(frontmatter["argument-hint"]).toBe("[focus]");
    expect(body.startsWith("Review")).toBe(true);
  });

  it("引数付きで展開する", () => {
    const result = expandTemplate(template, '"API compatibility"');
    expect(result.args).toEqual(["API compatibility"]);
    expect(result.output).toBe("Review the staged changes. Focus on API compatibility.");
  });

  it("description がなければ最初の空でない行（60 文字まで）を使う", () => {
    const long = `\n\n${"x".repeat(70)}`;
    expect(expandTemplate(long, "").description).toBe(`${"x".repeat(60)}...`);
  });
});
