// `pi --mode rpc` の stdin/stdout を学習用に模倣する（docs/rpc.md・rpc-commands.md・json.md 準拠）

export interface RpcState {
  isStreaming: boolean;
  steering: string[];
  followUp: string[];
  thinkingLevel: string;
  sessionName?: string;
  messageCount: number;
  lastAssistantText: string | null;
}

export type RecordDirection = "in" | "out";

export interface RpcRecord {
  direction: RecordDirection;
  json: Record<string, unknown>;
}

export interface RpcStep {
  state: RpcState;
  records: RpcRecord[];
}

export const THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

export function createRpcState(): RpcState {
  return {
    isStreaming: false,
    steering: [],
    followUp: [],
    thinkingLevel: "medium",
    messageCount: 0,
    lastAssistantText: null,
  };
}

const out = (json: Record<string, unknown>): RpcRecord => ({ direction: "out", json });

function response(
  command: string,
  id: unknown,
  extra: { success?: boolean; data?: unknown; error?: string } = {},
): RpcRecord {
  const json: Record<string, unknown> = {};
  if (typeof id === "string") json.id = id;
  json.type = "response";
  json.command = command;
  json.success = extra.success ?? true;
  if (extra.data !== undefined) json.data = extra.data;
  if (extra.error !== undefined) json.error = extra.error;
  return out(json);
}

function queueUpdate(state: RpcState): RpcRecord {
  return out({ type: "queue_update", steering: [...state.steering], followUp: [...state.followUp] });
}

/** 実行開始から、ツール実行中で止まるところまでのイベント */
function startRunEvents(message: string): RpcRecord[] {
  return [
    out({ type: "agent_start" }),
    out({ type: "turn_start" }),
    out({ type: "message_start", message: { role: "user", content: message } }),
    out({ type: "message_end", message: { role: "user", content: message } }),
    out({ type: "message_start", message: { role: "assistant" } }),
    out({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: "確認します。" },
    }),
    out({ type: "message_end", message: { role: "assistant", stopReason: "toolUse" } }),
    out({ type: "tool_execution_start", toolCallId: "call_1", toolName: "bash", args: { command: "ls" } }),
  ];
}

function assistantTurn(userText: string | null, reply: string): RpcRecord[] {
  const records: RpcRecord[] = [out({ type: "turn_start" })];
  if (userText !== null) {
    records.push(
      out({ type: "message_start", message: { role: "user", content: userText } }),
      out({ type: "message_end", message: { role: "user", content: userText } }),
    );
  }
  records.push(
    out({ type: "message_start", message: { role: "assistant" } }),
    out({
      type: "message_update",
      assistantMessageEvent: { type: "text_delta", contentIndex: 0, delta: reply },
    }),
    out({ type: "message_end", message: { role: "assistant", stopReason: "stop" } }),
    out({ type: "turn_end" }),
  );
  return records;
}

/** 進行中の実行を最後まで進める。すべての steering → すべての follow-up の順に取り込み、最後に agent_settled を出す。 */
export function completeRun(state: RpcState): RpcStep {
  if (!state.isStreaming) return { state, records: [] };
  const records: RpcRecord[] = [
    out({
      type: "tool_execution_end",
      toolCallId: "call_1",
      toolName: "bash",
      isError: false,
      durationMs: 12,
    }),
    out({ type: "message_start", message: { role: "toolResult", toolCallId: "call_1" } }),
    out({ type: "message_end", message: { role: "toolResult", toolCallId: "call_1" } }),
    out({ type: "turn_end" }),
  ];
  let next: RpcState = { ...state, messageCount: state.messageCount + 3 };

  // steering はツール実行後・次の LLM 呼び出しの前に入る。
  // steeringMode が one-at-a-time なので、1 件ずつ別のターンで取り込み、キューを空にする
  if (next.steering.length === 0) {
    records.push(...assistantTurn(null, "ファイル一覧を確認しました。"));
    next = { ...next, messageCount: next.messageCount + 1 };
  }
  while (next.steering.length > 0) {
    const [first, ...rest] = next.steering;
    next = { ...next, steering: rest, messageCount: next.messageCount + 2 };
    records.push(queueUpdate(next), ...assistantTurn(first, "方針を変更して対応しました。"));
  }

  // follow-up はエージェントが止まろうとした時点で取り込まれる
  while (next.followUp.length > 0) {
    const [first, ...rest] = next.followUp;
    next = { ...next, followUp: rest, messageCount: next.messageCount + 2 };
    records.push(queueUpdate(next), ...assistantTurn(first, "追加の依頼にも対応しました。"));
  }

  records.push(out({ type: "agent_end", willRetry: false }), out({ type: "agent_settled", aborted: false }));
  return { state: { ...next, isStreaming: false, lastAssistantText: "対応が完了しました。" }, records };
}

/** stdin に1行書き込んだときの応答とイベントを返す。 */
export function sendRpcLine(state: RpcState, line: string): RpcStep {
  const trimmed = line.trim();
  if (!trimmed) return { state, records: [] };

  let command: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
      throw new Error("not an object");
    command = parsed as Record<string, unknown>;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      state,
      records: [
        response("parse", undefined, { success: false, error: `Failed to parse command: ${reason}` }),
      ],
    };
  }

  const input: RpcRecord = { direction: "in", json: command };
  const { id, type } = command;
  const message = typeof command.message === "string" ? command.message : "";

  switch (type) {
    case "prompt": {
      if (!message) {
        return {
          state,
          records: [input, response("prompt", id, { success: false, error: "message is required" })],
        };
      }
      if (state.isStreaming) {
        const behavior = command.streamingBehavior;
        if (behavior !== "steer" && behavior !== "followUp") {
          return {
            state,
            records: [
              input,
              response("prompt", id, {
                success: false,
                error: "Agent is streaming; specify streamingBehavior (steer or followUp)",
              }),
            ],
          };
        }
        const next =
          behavior === "steer"
            ? { ...state, steering: [...state.steering, message] }
            : { ...state, followUp: [...state.followUp, message] };
        return {
          state: next,
          records: [input, response("prompt", id, { data: { disposition: "queued" } }), queueUpdate(next)],
        };
      }
      return {
        state: { ...state, isStreaming: true },
        records: [
          input,
          response("prompt", id, { data: { disposition: "started" } }),
          ...startRunEvents(message),
        ],
      };
    }
    case "steer":
    case "follow_up": {
      if (!message) {
        return {
          state,
          records: [input, response(type, id, { success: false, error: "message is required" })],
        };
      }
      const next =
        type === "steer"
          ? { ...state, steering: [...state.steering, message] }
          : { ...state, followUp: [...state.followUp, message] };
      return {
        state: next,
        records: [input, response(type, id, { data: { disposition: "queued" } }), queueUpdate(next)],
      };
    }
    case "abort": {
      if (!state.isStreaming) return { state, records: [input, response("abort", id)] };
      return {
        state: { ...state, isStreaming: false },
        records: [
          input,
          out({ type: "tool_execution_end", toolCallId: "call_1", toolName: "bash", isError: true }),
          out({ type: "turn_end" }),
          out({ type: "agent_end", willRetry: false }),
          out({ type: "agent_settled", aborted: true }),
          response("abort", id),
        ],
      };
    }
    case "clear_queue": {
      const data = { steering: state.steering, followUp: state.followUp };
      const next = { ...state, steering: [], followUp: [] };
      return { state: next, records: [input, response("clear_queue", id, { data }), queueUpdate(next)] };
    }
    case "get_state": {
      const data: Record<string, unknown> = {
        thinkingLevel: state.thinkingLevel,
        isStreaming: state.isStreaming,
        isCompacting: false,
        steeringMode: "one-at-a-time",
        followUpMode: "one-at-a-time",
        sessionId: "abc123",
        autoCompactionEnabled: true,
        messageCount: state.messageCount,
        pendingMessageCount: state.steering.length + state.followUp.length,
      };
      if (state.sessionName) data.sessionName = state.sessionName;
      return { state, records: [input, response("get_state", id, { data })] };
    }
    case "set_thinking_level": {
      const level = command.level;
      if (typeof level !== "string" || !THINKING_LEVELS.includes(level)) {
        return {
          state,
          records: [
            input,
            response("set_thinking_level", id, {
              success: false,
              error: `Invalid thinking level: ${String(level)}`,
            }),
          ],
        };
      }
      return {
        state: { ...state, thinkingLevel: level },
        records: [input, response("set_thinking_level", id), out({ type: "thinking_level_changed", level })],
      };
    }
    case "set_session_name": {
      const name = typeof command.name === "string" && command.name.trim() ? command.name.trim() : undefined;
      const event: Record<string, unknown> = { type: "session_info_changed" };
      if (name) event.name = name;
      return {
        state: { ...state, sessionName: name },
        records: [input, response("set_session_name", id), out(event)],
      };
    }
    case "get_last_assistant_text":
      return {
        state,
        records: [
          input,
          response("get_last_assistant_text", id, { data: { text: state.lastAssistantText } }),
        ],
      };
    default:
      return {
        state,
        records: [
          input,
          response(String(type ?? "unknown"), id, {
            success: false,
            error: `Unknown command: ${String(type)}`,
          }),
        ],
      };
  }
}
