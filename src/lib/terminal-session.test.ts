import { describe, expect, it } from "vitest";
import { initialSimState, type SimAction, type SimState, simReducer } from "./terminal-session";

const apply = (state: SimState, ...actions: SimAction[]) => actions.reduce(simReducer, state);

/** 実行が終わるまで tick を進める（無限ループ防止の上限付き） */
function runToEnd(state: SimState): SimState {
  let current = state;
  for (let i = 0; i < 50 && current.run; i++) current = simReducer(current, { type: "tick" });
  return current;
}

function started(prompt: string): SimState {
  return apply(initialSimState(), { type: "submit", text: "/login" }, { type: "submit", text: prompt });
}

describe("terminal-session", () => {
  it("ツール実行中の steer はそのツールの直後に取り込まれる", () => {
    const state = apply(started("@README.md を要約して"), { type: "submit", text: "src も見て" });
    const next = simReducer(state, { type: "tick" });
    expect(next.steering).toEqual([]);
    expect(next.lines.some((l) => l.text.includes("steering を取り込み: src も見て"))).toBe(true);
  });

  it("最後の応答中に送った steer も、実行が止まる前に次のターンとして取り込まれる", () => {
    let state = started("@README.md を要約して");
    // 最後のステップ（アシスタントの応答）の直前まで進める
    while (state.run && state.run.index < state.run.steps.length - 1) {
      state = simReducer(state, { type: "tick" });
    }
    expect(state.run?.steps[state.run.index].kind).toBe("assistant");

    state = simReducer(state, { type: "submit", text: "やっぱりテストも" });
    expect(state.steering).toEqual(["やっぱりテストも"]);

    state = simReducer(state, { type: "tick" });
    expect(state.steering).toEqual([]);
    expect(state.run).not.toBeNull();
    expect(state.lines.at(-1)).toEqual({ kind: "user", text: "やっぱりテストも" });

    const done = runToEnd(state);
    expect(done.run).toBeNull();
    expect(done.steering).toEqual([]);
  });

  it("steer と follow-up が両方残っていれば steer が先に処理される", () => {
    let state = started("テストの実行方法は？");
    while (state.run && state.run.index < state.run.steps.length - 1) {
      state = simReducer(state, { type: "tick" });
    }
    state = apply(state, { type: "follow-up", text: "最後に要約" }, { type: "submit", text: "lint も" });
    const done = runToEnd(state);
    const users = done.lines.filter((l) => l.kind === "user").map((l) => l.text);
    expect(users.slice(-2)).toEqual(["lint も", "最後に要約"]);
    expect(done.followUp).toEqual([]);
  });

  it("Esc で中断するとキューはエディターに戻る", () => {
    const state = apply(
      started("テストの実行方法は？"),
      { type: "submit", text: "a" },
      { type: "follow-up", text: "b" },
      { type: "abort" },
    );
    expect(state.run).toBeNull();
    expect(state.restored).toBe("a\nb");
    expect(state.achieved).toContain("abort");
  });
});
