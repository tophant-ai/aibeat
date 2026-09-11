import { createHash, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import http from "node:http";

import { BoundedEvidenceStore, EvidenceCollector } from "./evidence.mjs";

const invocationPath = "/v1/agent/invocations";
const evidenceBasePath = "/v1/evidence";
const runIDPattern = /^run-[a-z0-9][a-z0-9-]*$/;
const caseIDPattern = /^case-[a-z0-9][a-z0-9-]*$/;
const forbiddenMetadataKey = /(^|_)(model|model_id|base_url|endpoint|api_key|key|token|secret|workspace|cwd|sandbox|tools?|mcp|runtime|executor|profile|fixture|state|verifier|oracle|control|sidecar)($|_)/;

class RequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function requireOptionString(value, name, maxLength = 256) {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) throw new TypeError(`${name} is required`);
  return value.trim();
}

export function bearerTokenFromFile(path) {
  const token = readFileSync(requireOptionString(path, "token file path", 4096), "utf8").trim();
  if (!token || token === "REPLACE_ME" || token === "NO_AUTH") throw new Error("Target bearer token file is empty or contains a placeholder");
  return token;
}

function authorized(request, token) {
  const supplied = Buffer.from(String(request.headers.authorization || ""));
  const expected = Buffer.from(`Bearer ${token}`);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

function rejectUnknownKeys(value, allowed, location) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new RequestError(400, "invalid_request_schema", `${location} contains unknown field ${key}`);
  }
}

function assertNoRuntimeOverrides(value, path = "metadata", depth = 0) {
  if (depth > 8) throw new RequestError(400, "invalid_metadata", "metadata nesting is too deep");
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoRuntimeOverrides(item, `${path}[${index}]`, depth + 1));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replace(/[-.]/g, "_");
    if (forbiddenMetadataKey.test(normalized)) {
      throw new RequestError(400, "runtime_override_forbidden", `${path}.${key} cannot configure the Target runtime`);
    }
    assertNoRuntimeOverrides(nested, `${path}.${key}`, depth + 1);
  }
}

function parseInvocation(parsed, request) {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RequestError(400, "invalid_request_schema", "request must be a JSON object");
  }
  rejectUnknownKeys(parsed, new Set(["schema_version", "run_id", "case_id", "input", "metadata"]), "request");
  if (parsed.schema_version !== "target-invocation-v1") {
    throw new RequestError(400, "target_invocation_schema_invalid", "schema_version must be target-invocation-v1");
  }
  if (typeof parsed.run_id !== "string" || !runIDPattern.test(parsed.run_id) || parsed.run_id.length > 160) {
    throw new RequestError(400, "invalid_run_id", "run_id is invalid");
  }
  if (typeof parsed.case_id !== "string" || !caseIDPattern.test(parsed.case_id) || parsed.case_id.length > 200) {
    throw new RequestError(400, "invalid_case_id", "case_id is invalid");
  }
  if (!parsed.input || typeof parsed.input !== "object" || Array.isArray(parsed.input)) {
    throw new RequestError(400, "invalid_input", "input must be an object");
  }
  rejectUnknownKeys(parsed.input, new Set(["text"]), "input");
  if (typeof parsed.input.text !== "string" || !parsed.input.text.trim() || Buffer.byteLength(parsed.input.text, "utf8") > 512 * 1024) {
    throw new RequestError(400, "invalid_input", "input.text must be a non-empty string no larger than 512 KiB");
  }
  const metadata = parsed.metadata ?? {};
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new RequestError(400, "invalid_metadata", "metadata must be an object");
  }
  assertNoRuntimeOverrides(metadata);
  if (request.headers["x-aibeat-run-id"] !== parsed.run_id || request.headers["x-aibeat-case-id"] !== parsed.case_id) {
    throw new RequestError(400, "correlation_binding_mismatch", "AI Beat correlation headers must exactly match the request body");
  }
  return {
    runId: parsed.run_id,
    caseId: parsed.case_id,
    input: { text: parsed.input.text },
    metadata,
  };
}

async function readJSON(request, limit) {
  if (!String(request.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    throw new RequestError(415, "unsupported_media_type", "Content-Type must be application/json");
  }
  const declared = Number(request.headers["content-length"] || 0);
  if (declared > limit) throw new RequestError(413, "request_too_large", "request body exceeds configured limit");
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new RequestError(413, "request_too_large", "request body exceeds configured limit");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new RequestError(400, "invalid_json", "request body is not valid JSON");
  }
}

function writeJSON(response, status, value) {
  const body = JSON.stringify(value, (_key, nested) => {
    if (typeof nested === "number" && !Number.isFinite(nested)) {
      throw new TypeError("Target response contains a non-finite JSON number");
    }
    return nested;
  });
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function taskID(runId, caseId) {
  return `task-${createHash("sha256").update(`${runId}\0${caseId}`).digest("hex").slice(0, 24)}`;
}

/**
 * Creates the canonical Node Target transport around one existing Agent call.
 * The returned value is a normal node:http Server.
 */
export function createTargetServer({
  targetId,
  connectorId = "business-http-json-v1",
  auth,
  invoke,
  evidence = {},
  maxConcurrentRuns = 1,
  maxClaimedRuns = 10000,
  maxRequestBytes = 1 << 20,
  health = {},
  logger = console,
} = {}) {
  const normalizedTargetID = requireOptionString(targetId, "targetId");
  const normalizedConnectorID = requireOptionString(connectorId, "connectorId");
  const token = requireOptionString(auth, "auth", 8192);
  if (typeof invoke !== "function") throw new TypeError("invoke must be a function");
  if (!Number.isSafeInteger(maxConcurrentRuns) || maxConcurrentRuns < 1) throw new TypeError("maxConcurrentRuns is invalid");
  if (!Number.isSafeInteger(maxClaimedRuns) || maxClaimedRuns < maxConcurrentRuns) {
    throw new TypeError("maxClaimedRuns must be an integer no smaller than maxConcurrentRuns");
  }
  if (!Number.isSafeInteger(maxRequestBytes) || maxRequestBytes < 1024) throw new TypeError("maxRequestBytes is invalid");

  const evidenceEnabled = evidence !== false;
  const evidenceOptions = evidenceEnabled ? evidence : {};
  const store = evidenceEnabled ? (evidenceOptions.store || new BoundedEvidenceStore(evidenceOptions.maxRuns || 100)) : null;
  if (evidenceEnabled && (typeof store.put !== "function" || typeof store.get !== "function")) {
    throw new TypeError("Evidence store must implement put and get");
  }
  const active = new Set();
  const claimed = new Set();
  const claimOrder = [];

  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://target.invalid");
      if (request.method === "GET" && url.pathname === "/healthz") {
        const details = typeof health === "function" ? await health() : health;
        writeJSON(response, 200, {
          ...(details || {}),
          status: "ok",
          target_id: normalizedTargetID,
          connector_id: normalizedConnectorID,
          invocation_protocol: "target-invocation-v1",
          invocation_path: invocationPath,
          evidence: evidenceEnabled ? "L2" : "L1",
          active_runs: active.size,
          max_concurrent_runs: maxConcurrentRuns,
        });
        return;
      }

      if (!authorized(request, token)) {
        writeJSON(response, 401, { error: { code: "unauthorized", message: "valid Target bearer token required" } });
        return;
      }

      if (request.method === "GET" && url.pathname.startsWith(`${evidenceBasePath}/`)) {
        if (!evidenceEnabled) throw new RequestError(404, "not_found", "Evidence collection is disabled");
        const runId = decodeURIComponent(url.pathname.slice(evidenceBasePath.length + 1));
        if (!runIDPattern.test(runId)) throw new RequestError(404, "not_found", "Evidence not found");
        const document = await store.get(runId);
        if (!document) throw new RequestError(404, "not_found", "Evidence not found");
        writeJSON(response, 200, document);
        return;
      }

      if (request.method !== "POST" || url.pathname !== invocationPath) {
        throw new RequestError(404, "not_found", "route not found");
      }
      const invocation = parseInvocation(await readJSON(request, maxRequestBytes), request);
      if (claimed.has(invocation.runId) || active.has(invocation.runId)) {
        throw new RequestError(409, "run_id_reused", "run_id has already been accepted");
      }
      if (active.size >= maxConcurrentRuns) throw new RequestError(503, "target_busy", "Target concurrency limit reached");
      claimed.add(invocation.runId);
      claimOrder.push(invocation.runId);
      while (claimOrder.length > maxClaimedRuns) claimed.delete(claimOrder.shift());
      active.add(invocation.runId);

      try {
        const observe = evidenceEnabled ? new EvidenceCollector({
          runId: invocation.runId,
          caseId: invocation.caseId,
          source: evidenceOptions.source || normalizedTargetID,
          observedChannels: evidenceOptions.observedChannels || ["messages", "tools"],
          maxEvents: evidenceOptions.maxEvents,
          maxBytes: evidenceOptions.maxBytes,
          maxStringLength: evidenceOptions.maxStringLength,
          redact: evidenceOptions.redact,
        }) : null;
        const result = await invoke({ ...invocation, observe });
        if (!result || typeof result !== "object" || typeof result.finalResponse !== "string" || !result.finalResponse.trim()) {
          throw new Error("Agent invoke returned no finalResponse");
        }
        if (evidenceEnabled) await store.put(invocation.runId, observe.finalize());
        writeJSON(response, 200, {
          schema_version: "target-invocation-v1",
          run_id: invocation.runId,
          case_id: invocation.caseId,
          task_id: taskID(invocation.runId, invocation.caseId),
          status: "completed",
          final_response: result.finalResponse,
          ...(evidenceEnabled ? { evidence_ref: `${evidenceBasePath}/${encodeURIComponent(invocation.runId)}` } : {}),
          metadata: {
            ...(result.metadata || {}),
            target_id: normalizedTargetID,
            connector_id: normalizedConnectorID,
            evidence_level: evidenceEnabled ? "L2" : "L1",
          },
          ...(result.usage ? { usage: result.usage } : {}),
        });
      } catch (error) {
        logger?.error?.("Agent Target invocation failed", {
          run_id: invocation.runId,
          case_id: invocation.caseId,
          error: error?.message || "unknown",
        });
        throw new RequestError(502, "target_execution_failed", "Agent Target execution failed");
      } finally {
        active.delete(invocation.runId);
      }
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      const code = error instanceof RequestError ? error.code : "internal_error";
      const message = error instanceof RequestError ? error.message : "Target internal error";
      if (!response.headersSent) writeJSON(response, status, { error: { code, message } });
      else response.destroy();
    }
  });
}
