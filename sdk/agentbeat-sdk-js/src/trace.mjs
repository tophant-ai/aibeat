// Generic, protocol-agnostic trace utilities.
//
// These functions were extracted from the Codex app-server adapter
// (examples/codex_agent/app-server-adapter/adapter.mjs). Their signatures
// and internal behavior are intentionally unchanged so downstream adapters
// can switch to importing from this SDK without any behavior drift.

/**
 * Collects the final answer text out of a list of runtime events.
 * Prefers streamed `agent_response_delta` events (concatenated), and falls
 * back to the last `item_completed` agentMessage event's text.
 */
export function collectFinalAnswer(events) {
  const streamed = events
    .filter((event) => event.event_type === "agent_response_delta")
    .map((event) => event.delta || "")
    .join("");
  if (streamed.trim() !== "") {
    return streamed.trim();
  }
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event.event_type === "item_completed" && event.item_type === "agentMessage" && event.text) {
      return String(event.text).trim();
    }
  }
  return "";
}

/**
 * Converts a list of raw runtime events into TraceEvent records that
 * conform to the trace-event-v1 schema envelope (id/run_id/event_index/
 * event_type/source/timestamp_ms/payload).
 *
 * `timestamp_ms` is a required `number` field in trace-event-v1, so when
 * the source event carries no timestamp at all, this falls back to
 * `Date.now()` rather than `null` to stay schema-conformant.
 *
 * `options.defaultSource` lets callers pick a fallback `source` value for
 * events that don't carry their own (defaults to "agentbeat-sdk"; this
 * SDK is protocol-agnostic, so it does not assume a Codex-specific
 * source).
 */
export function buildTraceEvents(runtimeEvents, runID, options = {}) {
  const defaultSource = options.defaultSource || "agentbeat-sdk";
  return runtimeEvents.map((event, index) => {
    const timestamp = event.timestamp_ms ?? event.completed_at_ms ?? event.started_at_ms ?? Date.now();
    return {
      id: `${runID}:trace:${index}`,
      run_id: runID,
      event_index: index,
      event_type: event.event_type || "runtime_event",
      source: event.source || defaultSource,
      timestamp_ms: timestamp,
      payload: { ...event },
    };
  });
}

/**
 * Parses newline-delimited JSON out of a stream chunk, returning the
 * complete parsed messages plus any trailing partial line to prepend to
 * the next chunk.
 */
export function parseJsonLines(chunk, previousRemainder = "") {
  const combined = previousRemainder + chunk;
  const lines = combined.split(/\r?\n/);
  const remainder = combined.endsWith("\n") || combined.endsWith("\r\n") ? "" : lines.pop();
  const messages = [];
  for (const line of lines) {
    if (line.trim() === "") {
      continue;
    }
    messages.push(JSON.parse(line));
  }
  return { messages, remainder };
}

/**
 * Describes an error value as a human-readable string, unwrapping nested
 * `message` fields and falling back to JSON.stringify.
 */
export function describeError(error) {
  if (error instanceof Error) {
    if (typeof error.message === "string" && error.message !== "[object Object]") {
      return error.message;
    }
    return JSON.stringify(error);
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && Object.hasOwn(error, "message")) {
    return describeError(error.message);
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
