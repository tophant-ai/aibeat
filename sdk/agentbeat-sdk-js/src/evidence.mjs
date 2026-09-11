const RUN_ID = /^run-[a-z0-9][a-z0-9-]*$/;
const CASE_ID = /^case-[a-z0-9][a-z0-9-]*$/;
const CHANNELS = new Set(["messages", "tools", "files"]);
const EVENT_CHANNEL = new Map([
  ["message", "messages"],
  ["message.delta", "messages"],
  ["tool.call", "tools"],
  ["tool.result", "tools"],
  ["command.result", "tools"],
  ["file.change", "files"],
  ["run.error", "messages"],
  ["lifecycle", "messages"],
]);
const EVENT_DATA_KEYS = new Map([
  ["message", new Set(["role", "text", "attributes"])],
  ["message.delta", new Set(["role", "delta", "attributes"])],
  ["tool.call", new Set(["call_id", "name", "arguments", "attributes"])],
  ["tool.result", new Set(["call_id", "name", "result", "is_error", "status", "error", "attributes"])],
  ["command.result", new Set(["command", "exit_code", "output", "status", "attributes"])],
  ["file.change", new Set(["path", "diff", "changes", "status", "attributes"])],
  ["run.error", new Set(["message", "attributes"])],
  ["lifecycle", new Set(["name", "status", "attributes"])],
]);
const RFC3339 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
const SENSITIVE_KEY = /^(authorization|proxy_authorization|cookie|set_cookie|password|passwd|api_key|token|secret|credential)$|_(?:password|passwd|api_key|token|secret|credential)$/;
const TRUNCATION_MARKER = "\n[truncated]";

function stringLength(value) {
  return [...value].length;
}

function truncateString(value, limit) {
  return [...value].slice(0, limit).join("");
}

function normalizeSensitiveKey(key) {
  return String(key || "").trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[-.\s]+/g, "_");
}

function requireString(value, name, pattern = null, maxLength = 32768) {
  if (typeof value !== "string" || !value || stringLength(value) > maxLength || (pattern && !pattern.test(value))) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

function optionalString(value, name, maxLength = 32768) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || stringLength(value) > maxLength) throw new TypeError(`${name} is invalid`);
  return value;
}

function isoTimestamp(value, name) {
  if (typeof value === "string" && !RFC3339.test(value)) throw new TypeError(`${name} must be RFC3339 with a timezone`);
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${name} must be a valid timestamp`);
  return date.toISOString();
}

function defaultRedactor(key, value) {
  return SENSITIVE_KEY.test(normalizeSensitiveKey(key)) ? "[redacted]" : value;
}

function bounded(value, options, depth = 0, key = "") {
  value = options.redact(key, value);
  if (typeof value === "string") {
    return stringLength(value) > options.maxStringLength
      ? `${truncateString(value, options.maxStringLength - stringLength(TRUNCATION_MARKER))}${TRUNCATION_MARKER}`
      : value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Evidence values must be finite JSON numbers");
    return value;
  }
  if (value == null || typeof value === "boolean") return value;
  if (depth >= options.maxDepth) return "[truncated:depth]";
  if (Array.isArray(value)) {
    return value.slice(0, options.maxCollectionItems).map((item) => bounded(item, options, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== undefined).slice(0, options.maxCollectionItems).map(([nestedKey, nested]) => [
      truncateString(nestedKey, 256),
      bounded(nested, options, depth + 1, nestedKey),
    ]));
  }
  return String(value);
}

function normalizeChannels(channels) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new TypeError("observedChannels must contain at least one channel");
  }
  const normalized = [...new Set(channels)];
  for (const channel of normalized) {
    if (!CHANNELS.has(channel)) throw new TypeError(`unsupported Evidence channel ${channel}`);
  }
  if (!normalized.includes("messages") || !normalized.includes("tools")) {
    throw new TypeError("observedChannels must include messages and tools for L2 Evidence");
  }
  return normalized.sort();
}

function plainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${name} must be an object`);
  return value;
}

function validateEventData(type, rawData) {
  const data = plainObject(rawData, `${type}.data`);
  const allowedKeys = EVENT_DATA_KEYS.get(type);
  if (!allowedKeys) throw new TypeError(`unsupported Evidence event type ${type}`);
  for (const key of Object.keys(data)) {
    if (!allowedKeys.has(key)) throw new TypeError(`${type}.data contains unsupported field ${key}`);
  }
  switch (type) {
    case "message":
      if (!["system", "user", "assistant", "tool"].includes(data.role)) throw new TypeError("message.role is invalid");
      requireString(data.text, "message.text");
      break;
    case "message.delta":
      if (!["assistant", "tool"].includes(data.role)) throw new TypeError("message.delta role is invalid");
      requireString(data.delta, "message.delta");
      break;
    case "tool.call":
      requireString(data.call_id, "tool.call callId", null, 256);
      requireString(data.name, "tool.call name", null, 256);
      plainObject(data.arguments, "tool.call arguments");
      break;
    case "tool.result":
      requireString(data.call_id, "tool.result callId", null, 256);
      requireString(data.name, "tool.result name", null, 256);
      if (!Object.hasOwn(data, "result") || typeof data.is_error !== "boolean") {
        throw new TypeError("tool.result requires result and boolean isError");
      }
      optionalString(data.status, "tool.result status", 128);
      break;
    case "command.result":
      requireString(data.command, "command.result command");
      if (!Number.isSafeInteger(data.exit_code)) throw new TypeError("command.result exitCode must be an integer");
      optionalString(data.output, "command.result output");
      if (data.output === undefined || data.output === null) throw new TypeError("command.result output must be a string");
      optionalString(data.status, "command.result status", 128);
      break;
    case "file.change":
      requireString(data.path, "file.change path");
      if (!Object.hasOwn(data, "diff") && !Object.hasOwn(data, "changes")) throw new TypeError("file.change requires diff or changes");
      optionalString(data.diff, "file.change diff");
      if (Object.hasOwn(data, "changes") && !Array.isArray(data.changes)) throw new TypeError("file.change changes must be an array");
      optionalString(data.status, "file.change status", 128);
      break;
    case "run.error":
      requireString(data.message, "run.error message");
      break;
    case "lifecycle":
      requireString(data.name, "lifecycle name", null, 128);
      optionalString(data.status, "lifecycle status", 128);
      break;
    default:
      throw new TypeError(`unsupported Evidence event type ${type}`);
  }
  if (!Object.hasOwn(data, "attributes")) throw new TypeError(`${type}.attributes is required`);
  plainObject(data.attributes, `${type}.attributes`);
  return data;
}

function clone(value) {
  return structuredClone(value);
}

/**
 * Canonical, collection-only Evidence builder for new Agent integrations.
 * It never creates EvalRuns, invokes a Judge, or assigns a score.
 */
export class EvidenceCollector {
  constructor({
    runId,
    caseId,
    source = "agentbeat-sdk",
    observedChannels = ["messages", "tools"],
    startedAt = new Date(),
    clock = () => new Date(),
    maxEvents = 5000,
    maxBytes = 4 << 20,
    maxStringLength = 32768,
    maxCollectionItems = 100,
    maxDepth = 5,
    redact = defaultRedactor,
  } = {}) {
    this.runId = requireString(runId, "runId", RUN_ID, 160);
    this.caseId = requireString(caseId, "caseId", CASE_ID, 200);
    this.source = requireString(source, "source", null, 160);
    this.observedChannels = normalizeChannels(observedChannels);
    this.startedAt = isoTimestamp(startedAt, "startedAt");
    if (typeof clock !== "function") throw new TypeError("clock must be a function");
    if (!Number.isSafeInteger(maxEvents) || maxEvents < 1 || maxEvents > 5000) throw new TypeError("maxEvents must be an integer from 1 to 5000");
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1024) throw new TypeError("maxBytes must be at least 1024");
    if (!Number.isSafeInteger(maxStringLength) || maxStringLength < 128 || maxStringLength > 32768) throw new TypeError("maxStringLength is invalid");
    if (!Number.isSafeInteger(maxCollectionItems) || maxCollectionItems < 1) throw new TypeError("maxCollectionItems is invalid");
    if (!Number.isSafeInteger(maxDepth) || maxDepth < 1) throw new TypeError("maxDepth is invalid");
    if (typeof redact !== "function") throw new TypeError("redact must be a function");
    this.clock = clock;
    this.maxEvents = maxEvents;
    this.maxBytes = maxBytes;
    this.bounds = { maxStringLength, maxCollectionItems, maxDepth, redact };
    this.events = [];
    this.encodedBytes = 0;
    this.toolCalls = new Map();
    this.toolResults = new Set();
    this.finalized = false;
  }

  event({ type, data, source, occurredAt } = {}) {
    if (this.finalized) throw new Error("EvidenceCollector is already finalized");
    requireString(type, "event.type", null, 64);
    const channel = EVENT_CHANNEL.get(type);
    if (!channel) throw new TypeError(`unsupported Evidence event type ${type}`);
    if (!this.observedChannels.includes(channel)) throw new TypeError(`Evidence channel ${channel} was not declared observed`);
    const withAttributes = { ...plainObject(data, `${type}.data`), attributes: data.attributes ?? {} };
    const validatedData = validateEventData(type, withAttributes);
    const normalizedData = bounded(validatedData, this.bounds);
    // Bounds are applied before storage, so validate again to fail closed when
    // a caller chooses limits that would remove or change a required field.
    validateEventData(type, normalizedData);
    this.validateToolBinding(type, normalizedData);

    const sequence = this.events.length;
    const event = {
      event_id: `${this.runId}:event:${sequence}`,
      sequence,
      occurred_at: isoTimestamp(occurredAt ?? this.clock(), "event.occurredAt"),
      source: requireString(source ?? this.source, "event.source", null, 160),
      type,
      data: normalizedData,
    };
    const bytes = Buffer.byteLength(JSON.stringify(event), "utf8");
    if (this.events.length >= this.maxEvents) throw new Error("Evidence event limit exceeded");
    if (this.encodedBytes + bytes > this.maxBytes) throw new Error("Evidence byte limit exceeded");
    this.events.push(event);
    this.encodedBytes += bytes;
    return clone(event);
  }

  validateToolBinding(type, data) {
    if (type === "tool.call") {
      if (this.toolCalls.has(data.call_id)) throw new Error(`duplicate tool call_id ${data.call_id}`);
      this.toolCalls.set(data.call_id, data.name);
    }
    if (type === "tool.result") {
      if (!this.toolCalls.has(data.call_id)) throw new Error(`tool result has no matching call ${data.call_id}`);
      if (this.toolCalls.get(data.call_id) !== data.name) throw new Error(`tool result name does not match call ${data.call_id}`);
      if (this.toolResults.has(data.call_id)) throw new Error(`duplicate tool result for call ${data.call_id}`);
      this.toolResults.add(data.call_id);
    }
  }

  message({ role = "assistant", text, ...attributes }) {
    return this.event({ type: "message", data: { role, text, attributes } });
  }

  messageDelta({ role = "assistant", delta, ...attributes }) {
    return this.event({ type: "message.delta", data: { role, delta, attributes } });
  }

  toolCall({ callId, name, arguments: args = {}, ...attributes }) {
    return this.event({ type: "tool.call", data: { call_id: callId, name, arguments: args, attributes } });
  }

  toolResult({ callId, name, result = null, isError = false, status, error, ...attributes }) {
    const normalizedError = error instanceof Error ? error.message : error;
    return this.event({
      type: "tool.result",
      data: { call_id: callId, name, result, is_error: Boolean(isError), status, error: normalizedError, attributes },
    });
  }

  commandResult({ command, exitCode, output, status, ...attributes }) {
    return this.event({ type: "command.result", data: { command, exit_code: exitCode, output, status, attributes } });
  }

  fileChange({ path, diff, changes, status, ...attributes }) {
    return this.event({
      type: "file.change",
      data: {
        path,
        ...(diff !== undefined ? { diff } : {}),
        ...(changes !== undefined ? { changes } : {}),
        ...(status !== undefined ? { status } : {}),
        attributes,
      },
    });
  }

  error(error, attributes = {}) {
    const message = error instanceof Error ? error.message : String(error);
    return this.event({ type: "run.error", data: { message, attributes } });
  }

  lifecycle(name, { status, ...attributes } = {}) {
    return this.event({ type: "lifecycle", data: { name, status, attributes } });
  }

  toEvents() {
    return clone(this.events);
  }

  finalize({ finishedAt = this.clock() } = {}) {
    if (this.finalized) throw new Error("EvidenceCollector is already finalized");
    const evidence = {
      schema_version: "target-evidence-v1",
      run_id: this.runId,
      case_id: this.caseId,
      assurance_level: "L2",
      observed_channels: [...this.observedChannels],
      started_at: this.startedAt,
      finished_at: isoTimestamp(finishedAt, "finishedAt"),
      events: this.toEvents(),
    };
    if (evidence.events.length === 0) throw new Error("Evidence must contain at least one event");
    if (Date.parse(evidence.finished_at) < Date.parse(evidence.started_at)) throw new Error("Evidence finishedAt precedes startedAt");
    if (Buffer.byteLength(JSON.stringify(evidence), "utf8") > this.maxBytes) throw new Error("Evidence document byte limit exceeded");
    this.finalized = true;
    return evidence;
  }
}

export function buildTargetEvidence({ runId, caseId, source, observedChannels, events, startedAt, finishedAt, ...limits }) {
  const collector = new EvidenceCollector({ runId, caseId, source, observedChannels, startedAt, ...limits });
  for (const event of events) collector.event(event);
  return collector.finalize({ finishedAt });
}

export class BoundedEvidenceStore {
  constructor(maxRuns = 100) {
    if (!Number.isSafeInteger(maxRuns) || maxRuns < 1) throw new TypeError("maxRuns must be a positive integer");
    this.maxRuns = maxRuns;
    this.entries = new Map();
  }

  put(runId, evidence) {
    requireString(runId, "runId", RUN_ID, 160);
    if (!evidence || evidence.schema_version !== "target-evidence-v1" || evidence.run_id !== runId) {
      throw new TypeError("Evidence Store run binding is invalid");
    }
    this.entries.delete(runId);
    this.entries.set(runId, clone(evidence));
    while (this.entries.size > this.maxRuns) this.entries.delete(this.entries.keys().next().value);
  }

  get(runId) {
    const evidence = this.entries.get(runId);
    return evidence ? clone(evidence) : null;
  }
}
