import { describe, expect, it } from "vitest";
import { validateSkill, validateSkillName } from "./skill-validator";

const valid = `---
name: pdf-tools
description: Extract text and tables from PDF files. Use when reading PDFs.
---
# PDF tools
Run scripts relative to this skill directory.`;

describe("validateSkillName", () => {
  it("正しい名前はエラーなし", () => {
    expect(validateSkillName("pdf-tools2")).toEqual([]);
  });

  it("大文字・先頭末尾ハイフン・連続ハイフン・長さを検出する", () => {
    expect(validateSkillName("PDF")).toHaveLength(1);
    expect(validateSkillName("-pdf")).toHaveLength(1);
    expect(validateSkillName("pdf--tools")).toHaveLength(1);
    expect(validateSkillName("a".repeat(65))).toHaveLength(1);
  });
});

describe("validateSkill", () => {
  it("正しいスキルは読み込め、/skill:name で呼べる", () => {
    const report = validateSkill(valid, "pdf-tools");
    expect(report.loadable).toBe(true);
    expect(report.command).toBe("/skill:pdf-tools");
    expect(report.modelInvocable).toBe(true);
    expect(report.issues.filter((i) => i.level !== "info")).toEqual([]);
  });

  it("フロントマターがないと読み込めない", () => {
    expect(validateSkill("# no frontmatter", "x").loadable).toBe(false);
  });

  it("description がないと読み込めない", () => {
    const report = validateSkill("---\nname: x\n---\nbody", "x");
    expect(report.loadable).toBe(false);
    expect(report.issues.some((i) => i.level === "error")).toBe(true);
  });

  it("name の不正は警告にとどまる", () => {
    const report = validateSkill("---\nname: Bad_Name\ndescription: d\n---\nbody", "Bad_Name");
    expect(report.loadable).toBe(true);
    expect(report.issues.some((i) => i.level === "warning")).toBe(true);
  });

  it("disable-model-invocation でモデルからの自動選択を止める", () => {
    const report = validateSkill(
      "---\nname: x\ndescription: d\ndisable-model-invocation: true\n---\nbody",
      "x",
    );
    expect(report.modelInvocable).toBe(false);
  });

  it("未知のフィールドを警告する", () => {
    const report = validateSkill("---\nname: x\ndescription: d\nauthor: me\n---\nbody", "x");
    expect(report.issues.some((i) => i.message.includes("author"))).toBe(true);
  });
});
