// agentbeat-sdk entry point.
//
// Re-exports the generic trace / judge-observation / EvalRun building
// blocks (extracted from the Codex app-server adapter), plus a
// higher-level `TraceCollector` convenience class for third-party agent
// developers who want to report observability data without hand-building
// TraceEvent objects themselves.

export {
  buildTraceEvents,
  collectFinalAnswer,
  describeError,
  parseJsonLines,
} from "./trace.mjs";

export {
  buildJudgeObservation,
  incrementCount,
  sanitizeJudgeVars,
  summarizeTraceEvents,
} from "./judge.mjs";

export {
  buildArtifactManifest,
  buildEvalRun,
  buildEvalRunLinks,
} from "./evalRun.mjs";

export { createEvalServer } from "./server.mjs";
export {
  ADAPTER_SCHEMA_VERSION,
  EVAL_PROTOCOL_VERSION,
  defineAdapter,
} from "./adapter.mjs";

import { buildTraceEvents, describeError } from "./trace.mjs";
import { buildJudgeObservation } from "./judge.mjs";

/**
 * TraceCollector is a convenience wrapper around the raw trace-building
 * functions. Agent developers can instantiate one per run, call the
 * `record*` methods as their agent takes actions, and then call
 * `toTraceEvents()` / `buildObservation()` to produce schema-conformant
 * output.
 *
 * Every recorded event includes the trace-event-v1 required fields:
 * `event_type`, `source`, and `timestamp_ms`.
 *
 * Note on `recordEnvChange`: the trace-event-v1 schema's `event_type` is
 * constrained by a JSON Schema `enum`, and "env_change" is not one of the
 * 12 listed values. `additionalProperties: true` on the schema only
 * permits *extra field names* beyond the ones the schema declares (e.g.
 * `env_before` / `env_after` below); it does not relax the `enum`
 * constraint on `event_type` itself. `recordEnvChange` deliberately emits
 * `event_type: "env_change"` anyway, as an SDK-level extension for a case
 * the schema doesn't yet cover -- a strict schema validator checking the
 * `event_type` enum will reject this value. See this package's README for
 * the full explanation and the tradeoff this implies.
 */
export class TraceCollector {
  constructor(runId, { source = "sdk" } = {}) {
    this.runId = runId;
    this.source = source;
    this.events = [];
  }

  recordToolCall(name, args = {}) {
    const event = {
      event_type: "tool_call_executed",
      source: this.source,
      timestamp_ms: Date.now(),
      tool_name: name,
      arguments: args,
    };
    this.events.push(event);
    return event;
  }

  recordToolResult(name, result) {
    const event = {
      event_type: "tool_result_returned",
      source: this.source,
      timestamp_ms: Date.now(),
      tool_name: name,
      result: result ?? null,
    };
    this.events.push(event);
    return event;
  }

  recordFileDiff(path, diff) {
    const event = {
      event_type: "file_diff",
      source: this.source,
      timestamp_ms: Date.now(),
      path,
      diff,
    };
    this.events.push(event);
    return event;
  }

  /**
   * Extension event: "env_change" is not in the trace-event-v1
   * `event_type` enum. This is a deliberate, non-standard extension --
   * downstream consumers doing strict enum validation will reject it.
   * See the class-level doc comment and README for details.
   */
  recordEnvChange(before, after) {
    const event = {
      event_type: "env_change",
      source: this.source,
      timestamp_ms: Date.now(),
      env_before: before,
      env_after: after,
    };
    this.events.push(event);
    return event;
  }

  recordError(error) {
    const event = {
      event_type: "error",
      source: this.source,
      timestamp_ms: Date.now(),
      message: describeError(error),
    };
    this.events.push(event);
    return event;
  }

  /**
   * Returns all recorded events, unmodified, in the order they were
   * recorded. Useful when passing raw runtime events to
   * `buildJudgeObservation` directly.
   */
  toRuntimeEvents() {
    return [...this.events];
  }

  /**
   * Converts recorded events into TraceEvent records that conform to the
   * trace-event-v1 schema envelope.
   */
  toTraceEvents() {
    return buildTraceEvents(this.events, this.runId);
  }

  /**
   * Packages the collected events plus an answer and vars into a judge
   * observation payload, ready to hand to a judge.
   */
  buildObservation(answer, vars = {}) {
    const traceEvents = this.toTraceEvents();
    return buildJudgeObservation({
      targetType: "agent",
      answer,
      runtimeEvents: this.toRuntimeEvents(),
      traceEvents,
      vars,
    });
  }
}
