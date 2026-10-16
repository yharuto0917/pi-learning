import { describe, expect, it } from "vitest";
import {
  buildModelContext,
  cloneActive,
  compact,
  createInitialState,
  forkFrom,
  getActiveFile,
  getBranch,
  selectInTree,
  sendMessage,
} from "./session-tree";

describe("session-tree", () => {
  it("初期状態は 2 往復（4 エントリー）の一本道", () => {
    const state = createInitialState();
    expect(getBranch(getActiveFile(state))).toHaveLength(4);
  });

  it("ユーザーメッセージを選ぶとその直前に戻り、本文がエディターに戻る", () => {
    const state = createInitialState();
    const second = getActiveFile(state).entries[2];
    const next = selectInTree(state, second.id, false);
    expect(next.editorText).toBe(second.text);
    expect(getActiveFile(next).leafId).toBe(second.parentId);
  });

  it("戻って送信すると分岐ができ、元のブランチは消えない", () => {
    const state = createInitialState();
    const second = getActiveFile(state).entries[2];
    const branched = sendMessage(selectInTree(state, second.id, false), "lint の実行方法は？");
    const file = getActiveFile(branched);
    expect(file.entries).toHaveLength(6);
    expect(file.entries.filter((e) => e.parentId === second.parentId)).toHaveLength(2);
  });

  it("ブランチを離れるときに要約を付けられる", () => {
    const state = createInitialState();
    const first = getActiveFile(state).entries[0];
    const next = selectInTree(state, first.id, true);
    expect(getBranch(getActiveFile(next)).at(-1)?.role).toBe("branch_summary");
    expect(next.editorText).toBe(first.text);
  });

  it("/fork は新しいファイルを作り、選んだメッセージより前をコピーする", () => {
    const state = createInitialState();
    const second = getActiveFile(state).entries[2];
    const forked = forkFrom(state, second.id);
    expect(forked.files).toHaveLength(2);
    expect(getActiveFile(forked).entries).toHaveLength(2);
    expect(forked.editorText).toBe(second.text);
  });

  it("/clone はアクティブブランチを丸ごと複製する", () => {
    const cloned = cloneActive(createInitialState());
    expect(cloned.files).toHaveLength(2);
    expect(getActiveFile(cloned).entries).toHaveLength(4);
  });

  it("/compact 後のモデルコンテキストは要約＋直近のやりとり", () => {
    const compacted = compact(createInitialState());
    const file = getActiveFile(compacted);
    expect(file.entries).toHaveLength(5);
    const context = buildModelContext(file);
    expect(context.map((e) => e.role)).toEqual(["compaction", "user", "assistant"]);
  });
});
