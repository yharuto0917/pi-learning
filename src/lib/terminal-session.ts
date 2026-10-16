// ターミナル・シミュレーターの状態遷移（入力・実行の進行・steer / follow-up のキュー・中断）
import {
  createTermState,
  interpretInput,
  scriptForPrompt,
  type TermLine,
  type TermState,
} from "./terminal-sim";

export type MissionId =
  | "login"
  | "model"
  | "run"
  | "attach"
  | "bang"
  | "bangbang"
  | "steer"
  | "followup"
  | "abort"
  | "session";

export interface Mission {
  id: MissionId;
  label: string;
}

export interface Run {
  steps: TermLine[];
  index: number;
}

export interface SimState {
  term: TermState;
  lines: TermLine[];
  run: Run | null;
  steering: string[];
  followUp: string[];
  achieved: MissionId[];
  restored: string | null;
}

export type SimAction =
  | { type: "submit"; text: string }
  | { type: "follow-up"; text: string }
  | { type: "abort" }
  | { type: "tick" }
  | { type: "reset" };

const WELCOME: TermLine[] = [
  { kind: "muted", text: "pi v1.3.0 — 読み込み済み: AGENTS.md, skills (2), prompts (1)" },
  { kind: "muted", text: "ヒント: / でコマンド一覧、@ でファイル添付、! でシェル実行" },
];

export function initialSimState(): SimState {
  return {
    term: createTermState(),
    lines: WELCOME,
    run: null,
    steering: [],
    followUp: [],
    achieved: [],
    restored: null,
  };
}

function achieve(state: SimState, ...ids: MissionId[]): MissionId[] {
  const set = new Set(state.achieved);
  for (const id of ids) set.add(id);
  return [...set];
}

function startRun(steps: TermLine[]): Run {
  return {
    steps: [...steps, { kind: "assistant", text: "完了しました。変更点と結果を上にまとめています。" }],
    index: 0,
  };
}

export function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case "reset":
      return initialSimState();
    case "submit": {
      const text = action.text.trim();
      if (!text) return state;
      if (state.run) {
        // 実行中の Enter は steering としてキューに入る
        return {
          ...state,
          steering: [...state.steering, text],
          lines: [...state.lines, { kind: "queue", text: `⏎ steer をキューに追加: ${text}` }],
          achieved: achieve(state, "steer"),
          restored: null,
        };
      }
      const result = interpretInput(state.term, text);
      const ids: MissionId[] = [];
      if (text.startsWith("/login")) ids.push("login");
      if (text.startsWith("/model") && text.trim() !== "/model") ids.push("model");
      if (text.startsWith("/session")) ids.push("session");
      if (text.startsWith("!!")) ids.push("bangbang");
      else if (text.startsWith("!")) ids.push("bang");
      if (result.run) ids.push("run");
      if (result.run && result.run.attachments.length > 0) ids.push("attach");
      return {
        ...state,
        term: result.state,
        lines: result.clear ? result.lines : [...state.lines, ...result.lines],
        run: result.run ? startRun(scriptForPrompt(result.run)) : null,
        achieved: achieve(state, ...ids),
        restored: null,
      };
    }
    case "follow-up": {
      const text = action.text.trim();
      if (!text || !state.run) return simReducer(state, { type: "submit", text });
      return {
        ...state,
        followUp: [...state.followUp, text],
        lines: [...state.lines, { kind: "queue", text: `⌥⏎ follow-up をキューに追加: ${text}` }],
        achieved: achieve(state, "followup"),
        restored: null,
      };
    }
    case "abort": {
      if (!state.run) return state;
      const queued = [...state.steering, ...state.followUp];
      return {
        ...state,
        run: null,
        steering: [],
        followUp: [],
        lines: [
          ...state.lines,
          { kind: "error", text: "⎋ 中断しました" },
          ...(queued.length > 0
            ? [{ kind: "muted" as const, text: `キューの ${queued.length} 件をエディターに戻しました` }]
            : []),
        ],
        achieved: achieve(state, "abort"),
        restored: queued.length > 0 ? queued.join("\n") : null,
      };
    }
    case "tick": {
      if (!state.run) return state;
      const { steps, index } = state.run;
      const step = steps[index];
      let lines = [...state.lines, step];
      let steering = state.steering;
      let nextSteps = steps;

      // steering は現在のツール呼び出しが終わったあと、次の応答の前に取り込まれる
      if (step.kind === "tool" && steering.length > 0) {
        const [first, ...rest] = steering;
        steering = rest;
        lines = [...lines, { kind: "queue", text: `↳ steering を取り込み: ${first}` }];
        nextSteps = [
          ...steps.slice(0, index + 1),
          { kind: "tool", text: "read src/index.ts  # 指示に合わせて方針を変更" },
          ...steps.slice(index + 1),
        ];
      }

      if (index + 1 < nextSteps.length) {
        return { ...state, lines, steering, run: { steps: nextSteps, index: index + 1 } };
      }

      // 最後の応答中に送られた steering は、実行が止まる前に次のターンとして取り込む
      if (steering.length > 0) {
        const [first, ...rest] = steering;
        return {
          ...state,
          lines: [
            ...lines,
            { kind: "queue", text: `↳ steering を取り込み、次の応答へ: ${first}` },
            { kind: "user", text: first },
          ],
          steering: rest,
          run: startRun(scriptForPrompt({ prompt: first, attachments: [] })),
        };
      }

      // 実行が終わろうとした時点で follow-up を取り込む
      if (state.followUp.length > 0) {
        const [first, ...rest] = state.followUp;
        return {
          ...state,
          lines: [
            ...lines,
            { kind: "queue", text: `↳ follow-up を開始: ${first}` },
            { kind: "user", text: first },
          ],
          steering,
          followUp: rest,
          run: startRun(scriptForPrompt({ prompt: first, attachments: [] })),
        };
      }
      return { ...state, lines, steering, run: null };
    }
  }
}
