import { describe, expect, it } from "vitest";
import { defaultScenario, type LoopScenario, simulateAgentLoop } from "./agent-events";

const types = (scenario: Partial<LoopScenario>) =>
  simulateAgentLoop({ ...defaultScenario, ...scenario })
    .filter((e) => e.kind !== "hook")
    .map((e) => e.type);

const count = (list: string[], type: string) => list.filter((t) => t === type).length;

describe("simulateAgentLoop", () => {
  it("ツールなしは 1 ターンで終わる（README の prompt() イベント順）", () => {
    expect(types({ toolCalls: 0 })).toEqual([
      "agent_start",
      "turn_start",
      "message_start",
      "message_end",
      "message_start",
      "message_update",
      "message_end",
      "turn_end",
      "agent_end",
    ]);
  });

  it("ツール呼び出しがあると次のターンが続く", () => {
    const list = types({ toolCalls: 1 });
    expect(count(list, "turn_start")).toBe(2);
    expect(list.indexOf("tool_execution_end")).toBeLessThan(list.lastIndexOf("turn_start"));
  });

  it("並列実行ではプリフライトが順に行われ、終了は完了順になる", () => {
    const events = simulateAgentLoop({ ...defaultScenario, toolCalls: 2, toolExecution: "parallel" });
    const tool = events.filter((e) => e.kind === "tool").map((e) => e.label);
    expect(tool).toEqual(["read 開始", "grep 開始", "grep 終了", "read 終了"]);
  });

  it("逐次実行ではツールごとに結果メッセージが出る", () => {
    const events = simulateAgentLoop({ ...defaultScenario, toolCalls: 2, toolExecution: "sequential" });
    const labels = events.map((e) => e.label);
    expect(labels.indexOf("toolResult: read")).toBeLessThan(labels.indexOf("grep 開始"));
  });

  it("全ツールが terminate を返すと次の LLM 呼び出しをしない", () => {
    expect(count(types({ toolCalls: 2, terminateAll: true }), "turn_start")).toBe(1);
  });

  it("ブロックされたツールは afterToolCall を通らない", () => {
    const events = simulateAgentLoop({ ...defaultScenario, toolCalls: 1, blockFirstTool: true });
    expect(events.some((e) => e.type === "afterToolCall")).toBe(false);
  });

  it("steering は次のターンの先頭で取り込まれる", () => {
    const events = simulateAgentLoop({ ...defaultScenario, toolCalls: 1, steering: true });
    expect(events.filter((e) => e.type === "turn_start")).toHaveLength(2);
    expect(events.some((e) => e.label.includes("steering"))).toBe(true);
  });

  it("terminate でも steering が積まれていればもう1ターン走る", () => {
    expect(count(types({ toolCalls: 1, terminateAll: true, steering: true }), "turn_start")).toBe(2);
  });

  it("follow-up は止まる直前に取り込まれ、ターンが増える", () => {
    expect(count(types({ toolCalls: 0, followUp: true }), "turn_start")).toBe(2);
  });

  it("finishTurn が end を返すとキューを見ずに終了する", () => {
    const list = types({ toolCalls: 1, followUp: true, finishTurn: "end" });
    expect(count(list, "turn_start")).toBe(1);
    expect(list.at(-1)).toBe("agent_end");
  });

  it("finishTurn の continue は自然なリクエストがなければ1回だけ追加する", () => {
    expect(count(types({ toolCalls: 0, finishTurn: "continue-once" }), "turn_start")).toBe(2);
  });
});
