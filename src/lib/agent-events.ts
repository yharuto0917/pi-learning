// pi-agent-core の agentLoop が発行するイベント列を再現する（packages/agent/src/agent-loop.ts 準拠）

export type ToolExecutionMode = "parallel" | "sequential";
export type FinishTurnMode = "none" | "end" | "continue-once";

export interface LoopScenario {
  /** 最初のアシスタント応答に含まれるツール呼び出し数 */
  toolCalls: number;
  toolExecution: ToolExecutionMode;
  /** beforeToolCall で最初のツールをブロックする */
  blockFirstTool: boolean;
  /** すべてのツールが terminate: true を返す */
  terminateAll: boolean;
  /** ツール実行中に steer() でメッセージを積む */
  steering: boolean;
  /** 実行中に followUp() でメッセージを積む */
  followUp: boolean;
  /** finishTurn フックの振る舞い */
  finishTurn: FinishTurnMode;
}

export type EventKind = "agent" | "turn" | "message" | "tool" | "hook";

export interface LoopEvent {
  type: string;
  kind: EventKind;
  depth: number;
  label: string;
  note?: string;
}

export const defaultScenario: LoopScenario = {
  toolCalls: 1,
  toolExecution: "parallel",
  blockFirstTool: false,
  terminateAll: false,
  steering: false,
  followUp: false,
  finishTurn: "none",
};

const TOOL_NAMES = ["read", "grep", "bash"];

function toolName(index: number): string {
  return TOOL_NAMES[index % TOOL_NAMES.length];
}

/** シナリオから、エージェントが発行するイベントとフックの呼び出し順を組み立てる。 */
export function simulateAgentLoop(scenario: LoopScenario): LoopEvent[] {
  const events: LoopEvent[] = [];
  const push = (type: string, kind: EventKind, depth: number, label: string, note?: string) => {
    events.push({ type, kind, depth, label, note });
  };

  let steeringQueued = scenario.steering;
  let followUpQueued = scenario.followUp;
  let turnIndex = 0;
  let continueUsed = false;

  push("agent_start", "agent", 0, "エージェントの実行開始");
  push("turn_start", "turn", 1, "ターン 1 開始");
  push("message_start", "message", 2, "user: プロンプト");
  push("message_end", "message", 2, "user: プロンプト");

  let pendingInput: string | null = null;
  let explicitContinuation = false;

  // agent-loop.ts の outer / inner ループ構造をそのまま追う
  while (true) {
    let hasMoreToolCalls = true;

    while (hasMoreToolCalls || pendingInput !== null) {
      if (turnIndex > 0) {
        push("turn_start", "turn", 1, `ターン ${turnIndex + 1} 開始`);
      }
      if (pendingInput !== null) {
        push("message_start", "message", 2, pendingInput);
        push("message_end", "message", 2, pendingInput);
        pendingInput = null;
      }

      push(
        "prepareRequest",
        "hook",
        2,
        "prepareRequest フック",
        "プロバイダー呼び出し直前にコンテキストを差し替えられる",
      );

      const callsTools = turnIndex === 0 && scenario.toolCalls > 0;
      push("message_start", "message", 2, "assistant: 応答開始");
      push("message_update", "message", 3, "assistant: ストリーミング（text_delta など）");
      push(
        "message_end",
        "message",
        2,
        callsTools ? `assistant: toolCall × ${scenario.toolCalls}` : "assistant: 最終回答",
      );

      hasMoreToolCalls = false;
      if (callsTools) {
        const terminate = runTools(scenario, push);
        hasMoreToolCalls = !terminate;
      }

      const decision = decideFinishTurn(scenario, callsTools, continueUsed);
      if (decision === "continue") continueUsed = true;
      push(
        "finishTurn",
        "hook",
        2,
        "finishTurn フック",
        decision === undefined ? "undefined を返す（通常のスケジューリング）" : `{ action: "${decision}" }`,
      );
      push("turn_end", "turn", 1, `ターン ${turnIndex + 1} 終了`);
      turnIndex += 1;

      if (decision === "end") {
        push(
          "agent_end",
          "agent",
          0,
          "エージェントの実行終了",
          "finishTurn が end を返したのでキューを確認せず終了",
        );
        return events;
      }

      explicitContinuation = decision === "continue";
      if (steeringQueued) {
        pendingInput = "user: steering メッセージ";
        steeringQueued = false;
      }
      if (hasMoreToolCalls || pendingInput !== null) {
        explicitContinuation = false;
      }
    }

    if (followUpQueued) {
      followUpQueued = false;
      explicitContinuation = false;
      pendingInput = "user: follow-up メッセージ";
      continue;
    }

    if (explicitContinuation) {
      explicitContinuation = false;
      continue;
    }

    break;
  }

  push("agent_end", "agent", 0, "エージェントの実行終了");
  return events;
}

function decideFinishTurn(
  scenario: LoopScenario,
  callsTools: boolean,
  continueUsed: boolean,
): "end" | "continue" | undefined {
  if (scenario.finishTurn === "end") return "end";
  // 無条件に continue を返すと無限ループになるため、ツールを呼ばない最初のターンで1回だけ返す
  if (scenario.finishTurn === "continue-once" && !callsTools && !continueUsed) return "continue";
  return undefined;
}

type Push = (type: string, kind: EventKind, depth: number, label: string, note?: string) => void;

/** ツールバッチを実行し、全結果が terminate なら true を返す。 */
function runTools(scenario: LoopScenario, push: Push): boolean {
  const indexes = Array.from({ length: scenario.toolCalls }, (_, i) => i);
  const blocked = (i: number) => scenario.blockFirstTool && i === 0;
  const resultLabel = (i: number) => `toolResult: ${toolName(i)}${blocked(i) ? "（ブロック済み）" : ""}`;

  const preflight = (i: number) => {
    push("tool_execution_start", "tool", 2, `${toolName(i)} 開始`);
    push(
      "beforeToolCall",
      "hook",
      3,
      "beforeToolCall フック",
      blocked(i) ? "{ block: true } を返したので実行されない" : "引数の検証後に呼ばれる",
    );
  };
  const finish = (i: number) => {
    if (!blocked(i)) {
      push("afterToolCall", "hook", 3, "afterToolCall フック", "結果を加工してから終了イベントへ");
    }
    push("tool_execution_end", "tool", 2, `${toolName(i)} 終了${blocked(i) ? "（isError: true）" : ""}`);
  };

  if (scenario.toolExecution === "sequential") {
    for (const i of indexes) {
      preflight(i);
      finish(i);
      push("message_start", "message", 2, resultLabel(i));
      push("message_end", "message", 2, resultLabel(i));
    }
  } else {
    const runnable: number[] = [];
    for (const i of indexes) {
      preflight(i);
      if (blocked(i)) {
        push("tool_execution_end", "tool", 2, `${toolName(i)} 終了（isError: true）`);
      } else {
        runnable.push(i);
      }
    }
    // 並列実行では完了順に終了イベントが出る（ここでは後のツールほど早く終わる例）
    for (const i of [...runnable].reverse()) {
      push("afterToolCall", "hook", 3, "afterToolCall フック", "完了した順に呼ばれる");
      push("tool_execution_end", "tool", 2, `${toolName(i)} 終了`, "完了順");
    }
    for (const i of indexes) {
      push("message_start", "message", 2, resultLabel(i), "toolResult はアシスタントの記述順");
      push("message_end", "message", 2, resultLabel(i));
    }
  }

  // ブロックされた結果も terminate を付けない限り、バッチ全体の terminate にはならない
  return scenario.terminateAll && !scenario.blockFirstTool;
}
