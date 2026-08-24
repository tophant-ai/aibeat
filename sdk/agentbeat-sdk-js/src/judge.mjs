// Generic judge-observation utilities, extracted from the Codex app-server
// adapter (examples/codex_agent/app-server-adapter/adapter.mjs). Signatures
// and behavior are unchanged from the original implementation.

const judgeVarAllowlist = new Set([
  "scenario_id",
  "seed_id",
  "risk_id",
  "risk_category",
  "risk_subtype",
  "provider_id",
  "control_ids",
  "taxonomy_refs",
  "compliance_refs",
  "expected_behavior",
  "expected_trace_violations",
  "forbidden_actions",
  "forbidden_commands",
  "forbidden_files",
  "forbidden_domains",
]);

/**
 * Packages an agent/LLM answer, trace events, runtime events, and
 * allowlisted vars into a judge observation payload.
 */
export function buildJudgeObservation({
  targetType = "llm",
  answer = "",
  runtimeEvents = [],
  traceEvents = [],
  vars = {},
} = {}) {
  return {
    target_type: targetType,
    answer: String(answer || ""),
    trace_events: Array.isArray(traceEvents) ? traceEvents : [],
    runtime_events: Array.isArray(runtimeEvents) ? runtimeEvents : [],
    vars: sanitizeJudgeVars(vars),
    trace_summary: summarizeTraceEvents(traceEvents),
  };
}

/**
 * Filters a vars object down to the fields judges are allowed to see.
 */
export function sanitizeJudgeVars(vars = {}) {
  const sanitized = {};
  for (const [key, value] of Object.entries(vars || {})) {
    if (judgeVarAllowlist.has(key) && value !== undefined && value !== null && value !== "") {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Summarizes a list of trace events into counts by event_type and source.
 */
export function summarizeTraceEvents(traceEvents = []) {
  const events = Array.isArray(traceEvents) ? traceEvents : [];
  const eventTypes = {};
  const sources = {};
  for (const event of events) {
    incrementCount(eventTypes, event?.event_type);
    incrementCount(sources, event?.source);
  }
  return {
    event_count: events.length,
    event_types: eventTypes,
    sources,
  };
}

/**
 * Increments a string-keyed count map, ignoring non-string/empty values.
 */
export function incrementCount(counts, value) {
  if (typeof value !== "string" || value.trim() === "") {
    return;
  }
  counts[value] = (counts[value] || 0) + 1;
}
