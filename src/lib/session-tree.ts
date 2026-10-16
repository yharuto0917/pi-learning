// Pi のセッションツリー（/tree・/fork・/clone・/compact）を学習用に単純化したモデル

export type EntryRole = "user" | "assistant" | "compaction" | "branch_summary";

export interface SessionEntry {
  id: string;
  parentId: string | null;
  role: EntryRole;
  text: string;
  /** compaction のみ: この ID 以降のエントリーは要約せずに残す */
  firstKeptEntryId?: string;
}

export interface SessionFile {
  id: string;
  name: string;
  entries: SessionEntry[];
  leafId: string | null;
}

export interface SessionState {
  files: SessionFile[];
  activeFileId: string;
  editorText: string;
  nextId: number;
}

export function createInitialState(): SessionState {
  const file: SessionFile = { id: "s1", name: "session-1.jsonl", entries: [], leafId: null };
  let state: SessionState = { files: [file], activeFileId: file.id, editorText: "", nextId: 1 };
  state = sendMessage(state, "リポジトリの構成を説明して");
  state = sendMessage(state, "テストの実行方法は？");
  return state;
}

export function getActiveFile(state: SessionState): SessionFile {
  const file = state.files.find((f) => f.id === state.activeFileId);
  if (!file) throw new Error(`session not found: ${state.activeFileId}`);
  return file;
}

function findEntry(file: SessionFile, id: string | null): SessionEntry | undefined {
  return id === null ? undefined : file.entries.find((e) => e.id === id);
}

/** ルートから指定エントリーまでの経路（ブランチ）を返す。 */
export function getBranch(file: SessionFile, leafId: string | null = file.leafId): SessionEntry[] {
  const path: SessionEntry[] = [];
  let current = findEntry(file, leafId);
  while (current) {
    path.unshift(current);
    current = findEntry(file, current.parentId);
  }
  return path;
}

export function getChildren(file: SessionFile, parentId: string | null): SessionEntry[] {
  return file.entries.filter((e) => e.parentId === parentId);
}

function updateActiveFile(state: SessionState, update: (file: SessionFile) => SessionFile): SessionState {
  return {
    ...state,
    files: state.files.map((f) => (f.id === state.activeFileId ? update(f) : f)),
  };
}

function appendEntry(
  state: SessionState,
  role: EntryRole,
  text: string,
  extra: Partial<SessionEntry> = {},
): SessionState {
  const id = `e${state.nextId}`;
  const next = updateActiveFile(state, (file) => ({
    ...file,
    entries: [...file.entries, { id, parentId: file.leafId, role, text, ...extra }],
    leafId: id,
  }));
  return { ...next, nextId: state.nextId + 1 };
}

/** ユーザーメッセージを送り、擬似的なアシスタント応答を追加する。 */
export function sendMessage(state: SessionState, text: string): SessionState {
  const trimmed = text.trim();
  if (!trimmed) return state;
  const withUser = appendEntry(state, "user", trimmed);
  return { ...appendEntry(withUser, "assistant", `「${trimmed}」への応答`), editorText: "" };
}

/**
 * /tree でエントリーを選ぶ。ユーザーメッセージを選ぶとその直前に戻り、本文をエディターに戻す。
 * それ以外を選ぶとそのエントリーの後ろから続ける。
 */
export function selectInTree(state: SessionState, entryId: string, summarize: boolean): SessionState {
  const file = getActiveFile(state);
  const entry = findEntry(file, entryId);
  if (!entry) return state;

  const leftBranch = getBranch(file);
  const newLeaf = entry.role === "user" ? entry.parentId : entry.id;
  let next = updateActiveFile(state, (f) => ({ ...f, leafId: newLeaf }));
  next = { ...next, editorText: entry.role === "user" ? entry.text : "" };

  const newBranchIds = new Set(getBranch(getActiveFile(next)).map((e) => e.id));
  const abandoned = leftBranch.filter((e) => !newBranchIds.has(e.id) && e.role === "user");
  if (summarize && abandoned.length > 0) {
    const editorText = next.editorText;
    next = appendEntry(
      next,
      "branch_summary",
      `離れたブランチの要約: ${abandoned.map((e) => e.text).join(" / ")}`,
    );
    next = { ...next, editorText };
  }
  return next;
}

/** /fork: 以前のユーザーメッセージから新しいセッションファイルを作る。 */
export function forkFrom(state: SessionState, userEntryId: string): SessionState {
  const file = getActiveFile(state);
  const entry = findEntry(file, userEntryId);
  if (entry?.role !== "user") return state;
  const copied = getBranch(file, entry.parentId);
  return addFile(state, copied, entry.text);
}

/** /clone: 現在のアクティブブランチを新しいセッションファイルに複製する。 */
export function cloneActive(state: SessionState): SessionState {
  return addFile(state, getBranch(getActiveFile(state)), "");
}

function addFile(state: SessionState, entries: SessionEntry[], editorText: string): SessionState {
  const index = state.files.length + 1;
  const file: SessionFile = {
    id: `s${index}`,
    name: `session-${index}.jsonl`,
    entries: entries.map((e) => ({ ...e })),
    leafId: entries.at(-1)?.id ?? null,
  };
  return { ...state, files: [...state.files, file], activeFileId: file.id, editorText };
}

export function switchFile(state: SessionState, fileId: string): SessionState {
  return state.files.some((f) => f.id === fileId)
    ? { ...state, activeFileId: fileId, editorText: "" }
    : state;
}

/** /compact: 直近のユーザーメッセージ以降を残し、それより前を要約エントリーで置き換える。 */
export function compact(state: SessionState): SessionState {
  const branch = getBranch(getActiveFile(state));
  const lastUser = [...branch].reverse().find((e) => e.role === "user");
  if (!lastUser) return state;
  const summarized = branch.slice(0, branch.indexOf(lastUser)).filter((e) => e.role === "user");
  if (summarized.length === 0) return state;
  return appendEntry(state, "compaction", `要約: ${summarized.map((e) => e.text).join(" / ")}`, {
    firstKeptEntryId: lastUser.id,
  });
}

/** 次のモデルリクエストに含まれる履歴を返す（アクティブブランチ＋コンパクション適用）。 */
export function buildModelContext(file: SessionFile): SessionEntry[] {
  const branch = getBranch(file);
  const compactionIndex = branch.findLastIndex((e) => e.role === "compaction");
  if (compactionIndex === -1) return branch;

  const compaction = branch[compactionIndex];
  const keptIndex = branch.findIndex((e) => e.id === compaction.firstKeptEntryId);
  const kept = keptIndex === -1 ? [] : branch.slice(keptIndex, compactionIndex);
  return [compaction, ...kept, ...branch.slice(compactionIndex + 1)];
}
