import { describe, expect, it } from "vitest";
import { completeRun, createRpcState, type RpcRecord, sendRpcLine } from "./rpc-sim";

const outTypes = (records: RpcRecord[]) =>
  records.filter((r) => r.direction === "out").map((r) => r.json.type);

describe("rpc-sim", () => {
  it("不正な JSON は id なしの parse エラー", () => {
    const { records } = sendRpcLine(createRpcState(), "{oops");
    expect(records[0].json).toMatchObject({ type: "response", command: "parse", success: false });
    expect(records[0].json.id).toBeUndefined();
  });

  it("prompt の応答は id を返し、disposition は started", () => {
    const { state, records } = sendRpcLine(createRpcState(), '{"id":"req-1","type":"prompt","message":"hi"}');
    expect(state.isStreaming).toBe(true);
    expect(records[1].json).toMatchObject({
      id: "req-1",
      command: "prompt",
      data: { disposition: "started" },
    });
  });

  it("実行中の prompt は streamingBehavior がないとエラー、あればキューに入る", () => {
    const running = sendRpcLine(createRpcState(), '{"type":"prompt","message":"a"}').state;
    expect(sendRpcLine(running, '{"type":"prompt","message":"b"}').records[1].json.success).toBe(false);
    const queued = sendRpcLine(running, '{"type":"prompt","message":"b","streamingBehavior":"followUp"}');
    expect(queued.state.followUp).toEqual(["b"]);
    expect(outTypes(queued.records)).toContain("queue_update");
  });

  it("実行を完了させると agent_end の後に agent_settled が来る", () => {
    let state = sendRpcLine(createRpcState(), '{"type":"prompt","message":"a"}').state;
    state = sendRpcLine(state, '{"type":"steer","message":"change"}').state;
    state = sendRpcLine(state, '{"type":"follow_up","message":"later"}').state;
    const done = completeRun(state);
    const types = outTypes(done.records);
    expect(types.at(-2)).toBe("agent_end");
    expect(types.at(-1)).toBe("agent_settled");
    expect(done.state.isStreaming).toBe(false);
    expect(done.state.steering).toEqual([]);
    expect(done.state.followUp).toEqual([]);
  });

  it("abort は aborted: true の agent_settled を出してから応答する", () => {
    const running = sendRpcLine(createRpcState(), '{"type":"prompt","message":"a"}').state;
    const { records } = sendRpcLine(running, '{"type":"abort"}');
    const settled = records.find((r) => r.json.type === "agent_settled");
    expect(settled?.json.aborted).toBe(true);
    expect(records.at(-1)?.json.type).toBe("response");
  });

  it("get_state は現在の状態を返す", () => {
    const named = sendRpcLine(createRpcState(), '{"type":"set_session_name","name":"demo"}').state;
    const { records } = sendRpcLine(named, '{"id":"s","type":"get_state"}');
    expect(records[1].json).toMatchObject({ id: "s", data: { sessionName: "demo", isStreaming: false } });
  });

  it("不正な思考レベルは拒否する", () => {
    expect(
      sendRpcLine(createRpcState(), '{"type":"set_thinking_level","level":"huge"}').records[1].json.success,
    ).toBe(false);
  });
});
