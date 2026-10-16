// クイックスタートの「最小限の仕組みから始める」表を質問フローにしたもの

export type MechanismId =
  | "agents-md"
  | "prompt-template"
  | "skill"
  | "theme"
  | "extension"
  | "tui"
  | "models-json"
  | "custom-provider";

export interface Mechanism {
  id: MechanismId;
  title: string;
  where: string;
  summary: string;
  lessonId: string;
}

export interface Question {
  kind: "question";
  id: string;
  text: string;
  hint?: string;
  yes: string;
  no: string;
}

export interface Outcome {
  kind: "outcome";
  id: string;
  mechanism: MechanismId;
}

export type ChooserNode = Question | Outcome;

export const mechanisms: Record<MechanismId, Mechanism> = {
  "agents-md": {
    id: "agents-md",
    title: "AGENTS.md（コンテキストファイル）",
    where: "プロジェクト直下 / 親ディレクトリ / ~/.pi/agent/AGENTS.md",
    summary: "そのフォルダで Pi が動くとき常に従ってほしい指示を書く。",
    lessonId: "configuration",
  },
  "prompt-template": {
    id: "prompt-template",
    title: "プロンプトテンプレート",
    where: "~/.pi/agent/prompts/*.md または .pi/prompts/*.md",
    summary: "よく使うプロンプトを / コマンドとして再利用する。引数の差し込みも可能。",
    lessonId: "prompt-templates",
  },
  skill: {
    id: "skill",
    title: "スキル",
    where: "~/.pi/agent/skills/<name>/SKILL.md または .pi/skills/",
    summary: "必要なときだけ読み込まれる専門的な手順書。スクリプトや参考資料を同梱できる。",
    lessonId: "skills",
  },
  theme: {
    id: "theme",
    title: "テーマ",
    where: "~/.pi/agent/themes/<name>.json",
    summary: "ターミナル UI と HTML エクスポートの配色を変える。",
    lessonId: "themes-packages",
  },
  extension: {
    id: "extension",
    title: "拡張機能（Extension）",
    where: "~/.pi/agent/extensions/*.ts または .pi/extensions/",
    summary: "ツール・コマンド・イベントハンドラーなど、実行可能な振る舞いを TypeScript で追加する。",
    lessonId: "extensions",
  },
  tui: {
    id: "tui",
    title: "拡張機能 + Terminal UI コンポーネント",
    where: "拡張機能の中で ctx.ui.custom() と @earendil-works/pi-tui を使う",
    summary: "独自の描画と入力処理が必要な UI を作る。まずは ctx.ui の標準ダイアログで足りないか確認する。",
    lessonId: "extensions",
  },
  "models-json": {
    id: "models-json",
    title: "models.json（互換エンドポイント）",
    where: "~/.pi/agent/models.json",
    summary: "OpenAI / Anthropic / Google 互換 API を話すサーバー（Ollama・vLLM など）を追加する。",
    lessonId: "configuration",
  },
  "custom-provider": {
    id: "custom-provider",
    title: "カスタムプロバイダー拡張",
    where: "拡張機能で pi.registerProvider() を呼ぶ",
    summary: "独自のストリーミング・モデル探索・認証フローを持つサービスをつなぐ。",
    lessonId: "extensions",
  },
};

export const chooserNodes: Record<string, ChooserNode> = {
  start: {
    kind: "question",
    id: "start",
    text: "やりたいことに、コードとして実行される振る舞いは必要ですか？",
    hint: "例: 新しいツール、危険なコマンドの確認、イベントへの反応、独自 UI、新しいモデルサービス",
    yes: "needs-model",
    no: "always-on",
  },
  "always-on": {
    kind: "question",
    id: "always-on",
    text: "そのフォルダで作業するときは、毎回自動で従ってほしい指示ですか？",
    yes: "out-agents-md",
    no: "needs-files",
  },
  "needs-files": {
    kind: "question",
    id: "needs-files",
    text: "特定の作業でだけ必要な手順で、スクリプトや参考資料も一緒に渡したいですか？",
    hint: "モデルが必要と判断したときだけ全文を読み込む仕組みです",
    yes: "out-skill",
    no: "colors",
  },
  colors: {
    kind: "question",
    id: "colors",
    text: "変えたいのは Pi の配色（見た目）ですか？",
    yes: "out-theme",
    no: "out-prompt-template",
  },
  "needs-model": {
    kind: "question",
    id: "needs-model",
    text: "新しいモデルサービス（プロバイダー）に接続したいですか？",
    yes: "compatible-api",
    no: "custom-ui",
  },
  "compatible-api": {
    kind: "question",
    id: "compatible-api",
    text: "そのサービスは OpenAI / Anthropic / Google 互換の API を話しますか？",
    yes: "out-models-json",
    no: "out-custom-provider",
  },
  "custom-ui": {
    kind: "question",
    id: "custom-ui",
    text: "独自の描画とキー入力を持つターミナル UI コンポーネントが必要ですか？",
    hint: "確認ダイアログや通知だけなら ctx.ui の標準機能で足ります",
    yes: "out-tui",
    no: "out-extension",
  },
  "out-agents-md": { kind: "outcome", id: "out-agents-md", mechanism: "agents-md" },
  "out-skill": { kind: "outcome", id: "out-skill", mechanism: "skill" },
  "out-theme": { kind: "outcome", id: "out-theme", mechanism: "theme" },
  "out-prompt-template": { kind: "outcome", id: "out-prompt-template", mechanism: "prompt-template" },
  "out-models-json": { kind: "outcome", id: "out-models-json", mechanism: "models-json" },
  "out-custom-provider": { kind: "outcome", id: "out-custom-provider", mechanism: "custom-provider" },
  "out-tui": { kind: "outcome", id: "out-tui", mechanism: "tui" },
  "out-extension": { kind: "outcome", id: "out-extension", mechanism: "extension" },
};

/** 回答の列（true = はい）をたどり、到達したノードを返す。 */
export function walkChooser(answers: boolean[]): ChooserNode {
  let node = chooserNodes.start;
  for (const answer of answers) {
    if (node.kind === "outcome") break;
    node = chooserNodes[answer ? node.yes : node.no];
  }
  return node;
}
