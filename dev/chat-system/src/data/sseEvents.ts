// Mock SSE event timeline for a single tool-using turn.
// Mirrors the event sequence emitted by anthropicStreamToSSE() in
// packages/functions-shared/src/services/anthropic/streamToSSE.ts (lines 41-183).
//
// Scenario: user asks "Who's our top SMB by revenue this month?"
// Claude emits a short acknowledgment, then calls query_data with a SQL query.
// We see TEXT_MESSAGE_* events for the acknowledgment, then TOOL_CALL_* events
// for the SQL call, then the all-important CUSTOM(tool-input-available) that
// tells TanStack AI to actually execute the client-side tool.

export interface SseEvent {
  // Position in the visible timeline
  step: number;
  // Milliseconds since RUN_STARTED — illustrative, not load-tested
  tMs: number;
  // AG-UI event type
  type:
    | "RUN_STARTED"
    | "TEXT_MESSAGE_START"
    | "TEXT_MESSAGE_CONTENT"
    | "TEXT_MESSAGE_END"
    | "TOOL_CALL_START"
    | "TOOL_CALL_ARGS"
    | "TOOL_CALL_END"
    | "CUSTOM"
    | "RUN_FINISHED"
    | "DONE";
  // Optional CUSTOM event name (only set when type === "CUSTOM")
  name?: string;
  // What this event is doing, in plain English
  explain: string;
  // The actual JSON payload sent over the wire
  payload: Record<string, unknown> | string;
}

export const sseEvents: SseEvent[] = [
  {
    step: 1,
    tMs: 0,
    type: "RUN_STARTED",
    explain:
      "Backend has received the request, validated the JWT, and opened the stream from Anthropic. This event tells the frontend the run is officially live.",
    payload: { type: "RUN_STARTED", runId: "run_01HXZP...", timestamp: 1716220800000 },
  },
  {
    step: 2,
    tMs: 240,
    type: "TEXT_MESSAGE_START",
    explain:
      "Claude has started streaming a text block. The frontend creates a new text message bubble in the chat panel.",
    payload: { type: "TEXT_MESSAGE_START", messageId: "msg_01...", role: "assistant" },
  },
  {
    step: 3,
    tMs: 290,
    type: "TEXT_MESSAGE_CONTENT",
    explain:
      "First chunk of streamed text. Multiple CONTENT events arrive as tokens are produced — this is what makes the response 'type itself out' in the UI.",
    payload: { type: "TEXT_MESSAGE_CONTENT", delta: "Let me check " },
  },
  {
    step: 4,
    tMs: 320,
    type: "TEXT_MESSAGE_CONTENT",
    explain: "Next chunk of streamed text.",
    payload: { type: "TEXT_MESSAGE_CONTENT", delta: "this month's payment data." },
  },
  {
    step: 5,
    tMs: 360,
    type: "TEXT_MESSAGE_END",
    explain:
      "Claude finished the text block. The text bubble is now complete (no more tokens will be added to it).",
    payload: { type: "TEXT_MESSAGE_END" },
  },
  {
    step: 6,
    tMs: 380,
    type: "TOOL_CALL_START",
    explain:
      "Claude has decided to call a tool. The frontend renders a 'running' tool-call card with a yellow status badge.",
    payload: {
      type: "TOOL_CALL_START",
      toolCallId: "toolu_01ABC",
      toolName: "query_data",
    },
  },
  {
    step: 7,
    tMs: 430,
    type: "TOOL_CALL_ARGS",
    explain:
      "First chunk of the tool's input JSON, streamed token-by-token. The backend accumulates the partial JSON in a Map keyed by content-block index.",
    payload: { type: "TOOL_CALL_ARGS", delta: '{"sql":"SELECT s.smbId, s.com' },
  },
  {
    step: 8,
    tMs: 470,
    type: "TOOL_CALL_ARGS",
    explain: "More partial JSON.",
    payload: {
      type: "TOOL_CALL_ARGS",
      delta: 'panyName, SUM(p.amountPennies)/100.0 AS revenue FROM payments p',
    },
  },
  {
    step: 9,
    tMs: 510,
    type: "TOOL_CALL_ARGS",
    explain: "More partial JSON.",
    payload: {
      type: "TOOL_CALL_ARGS",
      delta:
        ' JOIN smbs s ON p.smbId=s.smbId WHERE p.paymentDate >= DATE \'2026-05-01\' GROUP BY 1,2 ORDER BY revenue DESC LIMIT 1"}',
    },
  },
  {
    step: 10,
    tMs: 540,
    type: "TOOL_CALL_END",
    explain:
      "Tool-call block is closed. The backend parses the accumulated JSON and finalizes the tool call. (Note: this alone is NOT enough to trigger execution — see the next event.)",
    payload: {
      type: "TOOL_CALL_END",
      toolCallId: "toolu_01ABC",
      toolName: "query_data",
      input: {
        sql: "SELECT s.smbId, s.companyName, SUM(p.amountPennies)/100.0 AS revenue FROM payments p JOIN smbs s ON p.smbId=s.smbId WHERE p.paymentDate >= DATE '2026-05-01' GROUP BY 1,2 ORDER BY revenue DESC LIMIT 1",
      },
    },
  },
  {
    step: 11,
    tMs: 545,
    type: "CUSTOM",
    name: "tool-input-available",
    explain:
      "THE LOAD-BEARING EVENT. TanStack AI's ChatClient does NOT auto-execute client tools from TOOL_CALL_END alone. The backend emits this custom event immediately after, and TanStack AI's onToolCall callback fires — which invokes the matching client executor in tools/queryData.ts.",
    payload: {
      type: "CUSTOM",
      name: "tool-input-available",
      value: {
        toolCallId: "toolu_01ABC",
        toolName: "query_data",
        input: { sql: "SELECT ..." },
      },
    },
  },
  {
    step: 12,
    tMs: 580,
    type: "RUN_FINISHED",
    explain:
      "Claude's first turn is done. finishReason='tool_calls' tells the frontend Claude wants to wait for tool results before continuing. usage tells you how many tokens this turn cost.",
    payload: {
      type: "RUN_FINISHED",
      runId: "run_01HXZP...",
      finishReason: "tool_calls",
      model: "claude-sonnet-4-6",
      usage: { promptTokens: 2412, completionTokens: 78, totalTokens: 2490 },
    },
  },
  {
    step: 13,
    tMs: 590,
    type: "DONE",
    explain:
      "SSE stream terminator. The connection closes. TanStack AI now runs the tool client-side (queries DuckDB), then opens a new POST /chat with the conversation including the tool result. That kicks off a fresh stream — same events all over again.",
    payload: "[DONE]",
  },
];

export const eventMapping = [
  {
    anthropic: "message_start",
    agui: "RUN_STARTED",
    note: "Generates a fresh runId UUID.",
  },
  {
    anthropic: "content_block_start (type=text)",
    agui: "TEXT_MESSAGE_START",
    note: "One per text block.",
  },
  {
    anthropic: "content_block_delta (text_delta)",
    agui: "TEXT_MESSAGE_CONTENT",
    note: "Many — one per streamed token chunk.",
  },
  {
    anthropic: "content_block_stop (text)",
    agui: "TEXT_MESSAGE_END",
    note: "Closes the text block.",
  },
  {
    anthropic: "content_block_start (type=tool_use)",
    agui: "TOOL_CALL_START",
    note: "Backend also tracks this block in a Map by index for argument accumulation.",
  },
  {
    anthropic: "content_block_delta (input_json_delta)",
    agui: "TOOL_CALL_ARGS",
    note: "Many — partial JSON. Backend appends to the tracked block's argsJson.",
  },
  {
    anthropic: "content_block_stop (tool_use)",
    agui: "TOOL_CALL_END + CUSTOM(tool-input-available)",
    note: "TWO events. The CUSTOM is the one that actually triggers execution.",
  },
  {
    anthropic: "message_delta",
    agui: "(captured, not emitted)",
    note: "Extracts stop_reason and output token count.",
  },
  {
    anthropic: "message_stop",
    agui: "RUN_FINISHED",
    note: "Includes usage tally.",
  },
  {
    anthropic: "(any error)",
    agui: "RUN_ERROR + DONE",
    note: "Graceful termination — the controller is closed.",
  },
];
