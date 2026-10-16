import { useState } from "react";
import { WidgetFrame } from "../components/widget-frame";
import { validateSkill } from "../lib/skill-validator";

const GOOD = `---
name: pdf-tools
description: Extract text and tables from PDF files. Use when reading, converting, or inspecting PDFs.
---

# PDF tools

Read \`references/formats.md\` before converting a document.
Run scripts relative to this skill directory.`;

const BAD = `---
name: PDF--Tools
description: Helps with PDFs
author: me
---
`;

const MANUAL = `---
name: release
description: リリースノートを作成し、タグを打つ手順。リリース作業を明示的に頼まれたときに使う。
disable-model-invocation: true
---

1. \`scripts/changelog.sh\` を実行して差分を集める
2. CHANGELOG.md を更新する`;

export function SkillValidatorWidget() {
  const [dir, setDir] = useState("pdf-tools");
  const [source, setSource] = useState(GOOD);
  const report = validateSkill(source, dir.trim() || "my-skill");

  const load = (d: string, s: string) => {
    setDir(d);
    setSource(s);
  };

  return (
    <WidgetFrame
      title="SKILL.md バリデーター"
      description="Agent Skills 仕様と Pi の検証ルールで、読み込めるか・どう呼ばれるかをその場で判定します。"
    >
      <div className="example-row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button type="button" className="btn small" onClick={() => load("pdf-tools", GOOD)}>
          良い例
        </button>
        <button type="button" className="btn small" onClick={() => load("PDF--Tools", BAD)}>
          問題のある例
        </button>
        <button type="button" className="btn small" onClick={() => load("release", MANUAL)}>
          明示呼び出し専用
        </button>
      </div>
      <div className="widget-grid">
        <div style={{ display: "grid", gap: 10 }}>
          <label className="field">
            <span>ディレクトリ名（~/.pi/agent/skills/…/）</span>
            <input className="input mono" value={dir} onChange={(e) => setDir(e.target.value)} />
          </label>
          <label className="field">
            <span>SKILL.md</span>
            <textarea
              className="textarea"
              rows={12}
              value={source}
              onChange={(e) => setSource(e.target.value)}
              spellCheck={false}
            />
          </label>
        </div>
        <div aria-live="polite">
          <div className={`status-banner ${report.loadable ? "ok" : "ng"}`}>
            {report.loadable ? "✓ Pi はこのスキルを読み込めます" : "✗ このスキルは読み込まれません"}
          </div>
          {report.loadable && (
            <div className="detail-card" style={{ marginBottom: 10 }}>
              <div>
                コマンド: <code>{report.command}</code>
              </div>
              <div>
                モデルによる自動選択:{" "}
                <strong>{report.modelInvocable ? "あり（説明文で判断）" : "なし（明示呼び出しのみ）"}</strong>
              </div>
              {report.modelInvocable && (
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  システムプロンプトに載るのは: {report.name} — {report.description.slice(0, 80)}
                  {report.description.length > 80 ? "…" : ""}
                </div>
              )}
            </div>
          )}
          {report.issues.length === 0 ? (
            <p className="muted">指摘はありません。</p>
          ) : (
            report.issues.map((issue) => (
              <div key={issue.message} className={`issue ${issue.level}`}>
                <strong>
                  {issue.level === "error" ? "エラー" : issue.level === "warning" ? "警告" : "ヒント"}
                </strong>
                <span>{issue.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </WidgetFrame>
  );
}
