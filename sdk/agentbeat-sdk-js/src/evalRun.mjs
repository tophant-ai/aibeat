// Generic EvalRun resource helpers, extracted from the Codex app-server
// adapter (examples/codex_agent/app-server-adapter/adapter.mjs). Signatures
// and behavior are unchanged from the original implementation.

/**
 * Builds the standard EvalRun resource link set for a given run id.
 */
export function buildEvalRunLinks(runID) {
  const encodedID = encodeURIComponent(runID);
  return {
    self: `/v1/eval/runs/${encodedID}`,
    events: `/v1/eval/runs/${encodedID}/events`,
    artifacts: `/v1/eval/runs/${encodedID}/artifacts`,
  };
}

const DEFAULT_PROTOCOL_VERSION = "agentbeat.eval.v1";
const DEFAULT_TARGET = "agent";

/**
 * Builds a standard EvalRun resource with phase-one status history and
 * metrics for the given run id and terminal status.
 *
 * `protocol_version` and `target` default to protocol-agnostic values
 * ("agentbeat.eval.v1" / "agent") since this SDK is not tied to any one
 * agent runtime; callers that need Codex-specific (or other
 * runtime-specific) values should pass `options.protocolVersion` /
 * `options.target` explicitly.
 */
export function buildEvalRun(runID, status, metrics = {}, options = {}) {
  const finalStatus = status === "failed" ? "failed" : "succeeded";
  const baseStatuses = ["queued", "running", "judging", "reporting", finalStatus];
  return {
    id: runID,
    status: finalStatus,
    protocol_version: options.protocolVersion || DEFAULT_PROTOCOL_VERSION,
    target: options.target || DEFAULT_TARGET,
    status_history: baseStatuses.map((entryStatus, index) => ({
      status: entryStatus,
      sequence: index,
    })),
    metrics: {
      latency_ms: metrics.latency_ms ?? null,
      runtime_event_count: metrics.runtime_event_count ?? 0,
      trace_event_count: metrics.trace_event_count ?? 0,
    },
    links: buildEvalRunLinks(runID),
  };
}

/**
 * Builds the artifact manifest describing the EvalRun JSON, raw events
 * JSONL, and trace events JSONL artifacts for a given run.
 *
 * `protocol_version` defaults to the same protocol-agnostic value as
 * `buildEvalRun`; pass `options.protocolVersion` to override.
 */
export function buildArtifactManifest(runID, traceEvents, runtimeEvents, options = {}) {
  return {
    run_id: runID,
    protocol_version: options.protocolVersion || DEFAULT_PROTOCOL_VERSION,
    artifacts: [
      {
        kind: "eval_run_json",
        path: `eval-runs/${runID}/eval-run.json`,
        href: buildEvalRunLinks(runID).self,
        description: "Standard EvalRun resource with phase-one status history.",
      },
      {
        kind: "raw_events_jsonl",
        path: `eval-runs/${runID}/raw-events.jsonl`,
        href: buildEvalRunLinks(runID).events,
        event_count: runtimeEvents.length,
        description: "Raw normalized runtime events captured from the agent's reported observability events.",
      },
      {
        kind: "trace_events_jsonl",
        path: `eval-runs/${runID}/trace-events.jsonl`,
        href: buildEvalRunLinks(runID).events,
        event_count: traceEvents.length,
        description: "TraceEvent records normalized for evidence analysis.",
      },
    ],
  };
}
