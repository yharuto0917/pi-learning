// Agent Skills 仕様と Pi の検証ルール（packages/coding-agent/src/core/skills.ts）を学習用に再現する
import { parseFrontmatter } from "./template-expander";

export const MAX_NAME_LENGTH = 64;
export const MAX_DESCRIPTION_LENGTH = 1024;

export const KNOWN_FIELDS = [
  "name",
  "description",
  "license",
  "compatibility",
  "metadata",
  "allowed-tools",
  "disable-model-invocation",
] as const;

export type IssueLevel = "error" | "warning" | "info";

export interface SkillIssue {
  level: IssueLevel;
  message: string;
}

export interface SkillReport {
  loadable: boolean;
  name: string;
  description: string;
  modelInvocable: boolean;
  command: string;
  issues: SkillIssue[];
}

export function validateSkillName(name: string): string[] {
  const errors: string[] = [];
  if (name.length > MAX_NAME_LENGTH) {
    errors.push(`name が ${MAX_NAME_LENGTH} 文字を超えています（${name.length} 文字）`);
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push("name に使えるのは小文字 a-z・数字・ハイフンのみです");
  }
  if (name.startsWith("-") || name.endsWith("-")) {
    errors.push("name の先頭・末尾にハイフンは使えません");
  }
  if (name.includes("--")) {
    errors.push("name にハイフンを連続させることはできません");
  }
  return errors;
}

export function validateSkillDescription(description: string | undefined): string[] {
  if (description === undefined || description.trim() === "") {
    return ["description は必須です（モデルがスキルを選ぶ手がかりになります）"];
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return [`description が ${MAX_DESCRIPTION_LENGTH} 文字を超えています（${description.length} 文字）`];
  }
  return [];
}

/** SKILL.md の内容を検証し、Pi が読み込めるか・どう呼び出されるかを返す。 */
export function validateSkill(source: string, directoryName: string): SkillReport {
  const issues: SkillIssue[] = [];
  const hasFrontmatter = /^---\r?\n[\s\S]*?\r?\n---/.test(source);

  if (!hasFrontmatter) {
    return {
      loadable: false,
      name: directoryName,
      description: "",
      modelInvocable: false,
      command: "",
      issues: [{ level: "error", message: "フロントマター（--- で囲んだ YAML）がありません" }],
    };
  }

  const { frontmatter, body } = parseFrontmatter(source);
  const name = frontmatter.name ?? directoryName;
  const description = frontmatter.description;

  const descriptionErrors = validateSkillDescription(description);
  for (const message of descriptionErrors) issues.push({ level: "error", message });

  // name の不正は Pi では警告扱い（起動は止めない）
  for (const message of validateSkillName(name)) issues.push({ level: "warning", message });

  if (frontmatter.name === undefined) {
    issues.push({
      level: "info",
      message: `name が省略されたためディレクトリ名「${directoryName}」を使います`,
    });
  } else if (frontmatter.name !== directoryName) {
    issues.push({
      level: "info",
      message:
        "name とディレクトリ名が異なります。Pi は許容しますが、他の実装との互換性のため揃えるのが無難です",
    });
  }

  for (const key of Object.keys(frontmatter)) {
    if (!(KNOWN_FIELDS as readonly string[]).includes(key)) {
      issues.push({ level: "warning", message: `未知のフィールド「${key}」は無視されます` });
    }
  }

  if (description && /^helps? with/i.test(description.trim())) {
    issues.push({
      level: "info",
      message: "「何をするか」と「いつ使うか」を両方書くと、モデルが適切にスキルを選べます",
    });
  }

  if (body.trim() === "") {
    issues.push({ level: "warning", message: "本文が空です。モデルが読み込んでも従う指示がありません" });
  }

  const modelInvocable = frontmatter["disable-model-invocation"] !== "true";

  return {
    loadable: descriptionErrors.length === 0,
    name,
    description: description ?? "",
    modelInvocable,
    command: `/skill:${name}`,
    issues,
  };
}
