import { useState } from "react";
import { WidgetFrame } from "../components/widget-frame";
import {
  buildModelContext,
  cloneActive,
  compact,
  createInitialState,
  forkFrom,
  getActiveFile,
  getBranch,
  getChildren,
  type SessionEntry,
  type SessionFile,
  selectInTree,
  sendMessage,
  switchFile,
} from "../lib/session-tree";

const ROLE_LABEL: Record<SessionEntry["role"], string> = {
  user: "user",
  assistant: "asst",
  compaction: "要約",
  branch_summary: "branch要約",
};

type Mode = "tree" | "fork";

export function SessionTreeExplorer() {
  const [state, setState] = useState(createInitialState);
  const [mode, setMode] = useState<Mode>("tree");
  const [summarize, setSummarize] = useState(false);
  const [log, setLog] = useState("ノードをクリックすると /tree の移動になります。");
  const file = getActiveFile(state);
  const branchIds = new Set(getBranch(file).map((e) => e.id));
  const context = buildModelContext(file);

  const onSelect = (entry: SessionEntry) => {
    if (mode === "fork") {
      if (entry.role !== "user") {
        setLog("/fork は以前のユーザーメッセージを起点にします。user のノードを選んでください。");
        return;
      }
      setState((s) => forkFrom(s, entry.id));
      setLog(
        `/fork: 「${entry.text}」の直前までをコピーした新しいセッションを作り、本文をエディターに戻しました。`,
      );
      setMode("tree");
      return;
    }
    setState((s) => selectInTree(s, entry.id, summarize));
    setLog(
      entry.role === "user"
        ? `/tree: 「${entry.text}」の直前に戻り、本文をエディターに戻しました。編集して送ると新しいブランチになります。`
        : "/tree: このエントリーの後ろから続けます（エディターは空）。",
    );
  };

  return (
    <WidgetFrame
      title="セッションツリー・エクスプローラー"
      description="メッセージを送り、過去のノードに戻って分岐させてみましょう。ハイライトがアクティブブランチ、枠線が現在の位置です。"
      actions={
        <button
          type="button"
          className="btn small"
          onClick={() => {
            setState(createInitialState());
            setLog("リセットしました。");
          }}
        >
          リセット
        </button>
      }
    >
      <fieldset className="file-tabs" aria-label="セッションファイル">
        {state.files.map((f) => (
          <button
            key={f.id}
            type="button"
            className="file-tab"
            aria-pressed={f.id === state.activeFileId}
            onClick={() => setState((s) => switchFile(s, f.id))}
          >
            {f.name}
          </button>
        ))}
      </fieldset>
      <div className="widget-grid">
        <div>
          <div className="panel-label">ツリー（{file.name}）</div>
          <div className="tree">
            <ul>
              <TreeLevel file={file} parentId={null} branchIds={branchIds} onSelect={onSelect} />
            </ul>
            {file.entries.length === 0 && <p className="muted">空のセッションです。</p>}
          </div>
          <form
            className="rpc-input"
            onSubmit={(e) => {
              e.preventDefault();
              if (!state.editorText.trim()) return;
              setState((s) => sendMessage(s, s.editorText));
              setLog("メッセージを送信し、現在の位置の子として追加しました。");
            }}
          >
            <input
              className="input"
              value={state.editorText}
              onChange={(e) => setState((s) => ({ ...s, editorText: e.target.value }))}
              placeholder="エディター: メッセージを入力"
              aria-label="エディター"
            />
            <button type="submit" className="btn primary" disabled={!state.editorText.trim()}>
              送信
            </button>
          </form>
        </div>
        <div>
          <div className="panel-label">操作</div>
          <div className="btn-row" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className="btn small"
              aria-pressed={mode === "fork"}
              onClick={() => {
                setMode(mode === "fork" ? "tree" : "fork");
                setLog(
                  mode === "fork"
                    ? "/tree モードに戻りました。"
                    : "/fork: 起点にするユーザーメッセージをクリックしてください。",
                );
              }}
            >
              {mode === "fork" ? "fork を取り消す" : "/fork"}
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setState((s) => cloneActive(s));
                setLog("/clone: アクティブブランチを新しいセッションファイルに複製しました。");
              }}
            >
              /clone
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                const next = compact(state);
                setLog(
                  next === state
                    ? "要約できる古い履歴がありません（直近のやりとりは残す設計です）。"
                    : "/compact: 古い履歴を要約エントリーに置き換えました。元のエントリーはツリーに残っています。",
                );
                setState(next);
              }}
            >
              /compact
            </button>
          </div>
          <label className="check" style={{ marginBottom: 12 }}>
            <input type="checkbox" checked={summarize} onChange={(e) => setSummarize(e.target.checked)} />
            ブランチを離れるときに要約を付ける
          </label>
          <div className="detail-card" style={{ marginBottom: 12 }} aria-live="polite">
            {log}
          </div>
          <div className="panel-label">次のモデルリクエストに含まれる履歴</div>
          <ul className="context-list">
            {context.map((e) => (
              <li key={e.id} className={e.role === "compaction" ? "compaction" : ""}>
                <strong className="mono" style={{ fontSize: 11 }}>
                  {ROLE_LABEL[e.role]}
                </strong>{" "}
                {e.text}
              </li>
            ))}
            {context.length === 0 && <li>（履歴なし）</li>}
          </ul>
        </div>
      </div>
    </WidgetFrame>
  );
}

interface TreeLevelProps {
  file: SessionFile;
  parentId: string | null;
  branchIds: Set<string>;
  onSelect: (entry: SessionEntry) => void;
}

/** 分岐のない一本道は同じ階層に並べ、分岐したところだけ字下げする */
function TreeLevel({ file, parentId, branchIds, onSelect }: TreeLevelProps) {
  const starts = getChildren(file, parentId);
  if (starts.length === 0) return null;
  if (starts.length === 1) {
    return <TreeChain file={file} start={starts[0]} branchIds={branchIds} onSelect={onSelect} />;
  }
  return (
    <>
      {starts.map((start) => (
        <li key={start.id}>
          <ul>
            <TreeChain file={file} start={start} branchIds={branchIds} onSelect={onSelect} />
          </ul>
        </li>
      ))}
    </>
  );
}

interface TreeChainProps {
  file: SessionFile;
  start: SessionEntry;
  branchIds: Set<string>;
  onSelect: (entry: SessionEntry) => void;
}

function TreeChain({ file, start, branchIds, onSelect }: TreeChainProps) {
  const chain: SessionEntry[] = [start];
  let children = getChildren(file, start.id);
  while (children.length === 1) {
    chain.push(children[0]);
    children = getChildren(file, children[0].id);
  }
  const last = chain[chain.length - 1];
  return (
    <>
      {chain.map((entry) => (
        <li key={entry.id}>
          <button
            type="button"
            className={`tree-node ${branchIds.has(entry.id) ? "on-branch" : ""} ${file.leafId === entry.id ? "leaf" : ""}`}
            onClick={() => onSelect(entry)}
            title={entry.text}
          >
            <span className={`role ${entry.role}`}>{ROLE_LABEL[entry.role]}</span>
            <span className="text">{entry.text}</span>
          </button>
        </li>
      ))}
      {children.length > 1 && (
        <TreeLevel file={file} parentId={last.id} branchIds={branchIds} onSelect={onSelect} />
      )}
    </>
  );
}
