// Generic EvalRun HTTP server skeleton, extracted from the Codex
// app-server adapter (examples/codex_agent/app-server-adapter/adapter.mjs).
//
// The original `createEvalServer` hardcoded a call to
// `runCodexAppServerTurn`, which is Codex protocol specific. This version
// takes a `runTurn` function as an injected dependency: the server only
// owns the HTTP routing / auth / in-memory storage and the generic
// TraceEvent / EvalRun / judge-observation assembly. Callers provide the
// Codex-specific (or any other agent runtime specific) turn execution.

import http from "node:http";

import { buildTraceEvents, collectFinalAnswer, describeError } from "./trace.mjs";
import { buildJudgeObservation } from "./judge.mjs";
import { buildArtifactManifest, buildEvalRun } from "./evalRun.mjs";

const DEFAULT_TOKEN_ENV_VAR = "AGENTBEAT_EVAL_TOKEN";

/**
 * Creates an HTTP server exposing the standard EvalRun resource routes:
 *   GET  /health
 *   POST /v1/eval/runs
 *   GET  /v1/eval/runs/:runID
 *   GET  /v1/eval/runs/:runID/events
 *   GET  /v1/eval/runs/:runID/artifacts
 *
 * options.runTurn(input) is required and must be an async function that
 * actually drives one turn of the underlying agent runtime. `input` is
 * `{ prompt, runtime, runID, vars }`. It may resolve to either:
 *   - an array of raw runtime events, or
 *   - an object `{ runtimeEvents, status, trace, source }` for callers
 *     that also want to report a terminal status or extra trace metadata.
 *
 * Auth: the eval run routes are protected with a Bearer token resolved,
 * in order, from:
 *   1. `options.token`
 *   2. `process.env[options.tokenEnvVar]`, if `options.tokenEnvVar` is set
 *   3. `process.env.AGENTBEAT_EVAL_TOKEN` (default env var name)
 * These are chained fallbacks, not a one-or-the-other choice: passing a
 * custom `tokenEnvVar` (e.g. so a Codex-specific adapter can keep reading
 * its own `CODEX_APP_SERVER_EVAL_TOKEN` env var) does not disable the
 * default `AGENTBEAT_EVAL_TOKEN` check -- if the custom env var isn't
 * set, the default one is still consulted before falling back to
 * unauthenticated. If none of the three resolve to a value, the routes
 * are unauthenticated (matching the original adapter's opt-in auth).
 * This SDK is protocol-agnostic, so it does not hardcode a Codex-specific
 * env var name as the *only* option; adapters that want their own env
 * var name should pass `options.tokenEnvVar` in addition to (not instead
 * of) the default staying active.
 *
 * A value only counts as "configured" at any of the three layers if it
 * is a non-empty, non-whitespace-only string: an env var that is
 * declared but left empty (`FOO=` in Docker/Compose/K8s, an unset
 * variable interpolated into `export FOO="$UNSET"`, etc.) or an empty
 * string passed as `options.token` is treated the same as that layer
 * being unset, and resolution falls through to the next layer rather
 * than silently disabling auth. The value used at each layer is also
 * *trimmed*, so a token loaded with trailing whitespace/newlines (common
 * when reading from a secrets file or a `.env` value) still matches an
 * incoming `Authorization` header, since Node's http module already
 * strips trailing OWS from header values before your handler sees them.
 * `options.tokenEnvVar` must itself be a non-empty string to be used as
 * an env var name; any other type (array, number, object, ...) is
 * ignored rather than being coerced into a property key.
 *
 * The `Bearer` scheme name in the `Authorization` header is matched
 * case-insensitively (so `bearer <token>` works too); only the token
 * value itself is compared exactly.
 *
 * options.adapterName is reported in the /health response (defaults to
 * "agentbeat-sdk").
 */
export function createEvalServer(rawOptions = {}) {
  // A default parameter only kicks in for `undefined`, not `null` -- an
  // explicit `createEvalServer(null)` would otherwise throw a bare
  // "Cannot read properties of null" TypeError deep inside option
  // access below instead of the same clean, descriptive error other
  // invalid inputs (0, "", false, []) already get via the runTurn check.
  const options = rawOptions && typeof rawOptions === "object" ? rawOptions : {};
  // Each layer is normalized through resolveConfiguredToken so that an
  // empty string, a whitespace-only string, or any non-string falsy value
  // (false, null, 0, undefined) is treated as "not configured" and the
  // chain moves on to the next layer, rather than being mistaken for a
  // deliberately-set (but empty) token and silently disabling auth.
  const explicitToken = resolveConfiguredToken(options.token);
  // options.tokenEnvVar must itself be a non-empty string to be used as
  // an env var *name* -- anything else (an array, a number, an object)
  // is ignored rather than being coerced into a property key (e.g. an
  // accidental `tokenEnvVar: ["PATH"]` must not end up reading
  // process.env.PATH as if it were a deliberately configured token).
  const customEnvToken =
    typeof options.tokenEnvVar === "string" && options.tokenEnvVar.trim() !== ""
      ? resolveConfiguredToken(process.env[options.tokenEnvVar])
      : undefined;
  const defaultEnvToken = resolveConfiguredToken(process.env[DEFAULT_TOKEN_ENV_VAR]);
  const token = explicitToken ?? customEnvToken ?? defaultEnvToken;
  const runTurn = options.runTurn;
  const adapterName = options.adapterName || "agentbeat-sdk";
  const defaultSource = options.defaultSource || adapterName;
  const protocolVersion = options.protocolVersion;
  const target = options.target;
  const registration = options.registration;
  if (typeof runTurn !== "function") {
    throw new Error("createEvalServer requires options.runTurn(input) to be a function");
  }
  const runs = new Map();
  return http.createServer(async (request, response) => {
    try {
      if (request.method === "GET" && request.url === "/health") {
        sendJSON(response, 200, {
          ok: true,
          adapter: adapterName,
          ...(registration ? { registration } : {}),
        });
        return;
      }
      const isRunCollection = isEvalRunCollection(request.url || "");
      const route = parseEvalRunRoute(request.url || "");
      if ((isRunCollection || route) && !isAuthorized(request, token)) {
        sendJSON(response, 401, { error: "unauthorized" });
        return;
      }
      if (request.method === "GET" && route) {
        const stored = runs.get(route.runID);
        if (!stored) {
          sendJSON(response, 404, { error: "eval run not found" });
          return;
        }
        if (route.child === "events") {
          sendJSON(response, 200, {
            run_id: stored.run_id,
            raw_events: stored.runtime_events,
            events: stored.trace_events,
          });
          return;
        }
        if (route.child === "artifacts") {
          sendJSON(response, 200, stored.artifact_manifest);
          return;
        }
        sendJSON(response, 200, stored);
        return;
      }
      if (request.method !== "POST" || !isRunCollection) {
        sendJSON(response, 404, { error: "not found" });
        return;
      }
      const payload = JSON.parse(await readBody(request));
      const prompt = payload.prompt ?? payload.input;
      if (!prompt) {
        sendJSON(response, 400, { error: "prompt is required" });
        return;
      }
      const result = await runEvalTurn(runTurn, {
        prompt,
        runtime: payload.runtime || {},
        runID: payload.run_id,
        vars: payload.vars || payload,
        defaultSource,
        protocolVersion,
        target,
      });
      runs.set(result.run_id, result);
      sendJSON(response, 200, result);
    } catch (error) {
      sendJSON(response, 500, { error: describeError(error) });
    }
  });
}

/**
 * Runs a single turn via the injected `runTurn` function and assembles the
 * generic EvalRun result: TraceEvents, EvalRun status history, judge
 * observation, and artifact manifest.
 */
async function runEvalTurn(runTurn, options) {
  const startedAt = Date.now();
  const turnOutput = await runTurn(options);
  const isArrayOutput = Array.isArray(turnOutput);
  const events = isArrayOutput ? [...turnOutput] : [...(turnOutput?.runtimeEvents || [])];
  const answer = collectFinalAnswer(events);
  // Keep the synthesized final_answer event's source consistent with the
  // rest of the run: prefer the runTurn output's explicitly declared
  // source, then whatever source the other reported events already use
  // (so a run whose events are all tagged "mock_agent" doesn't end with a
  // final_answer tagged differently), then fall back to the server-level
  // defaultSource.
  const eventSource = (!isArrayOutput && turnOutput?.source) || findEventSource(events) || options.defaultSource;
  events.push({
    event_type: "final_answer",
    source: eventSource,
    text: answer,
  });
  const runID = options.runID || `run_${Date.now()}`;
  const traceEvents = buildTraceEvents(events, runID, { defaultSource: options.defaultSource });
  const metrics = {
    latency_ms: Date.now() - startedAt,
    runtime_event_count: events.length,
    trace_event_count: traceEvents.length,
  };
  const status = !isArrayOutput && turnOutput?.status === "failed" ? "failed" : "completed";
  const evalRunOptions = { protocolVersion: options.protocolVersion, target: options.target };
  const evalRun = buildEvalRun(runID, status, metrics, evalRunOptions);
  const judgeObservation = buildJudgeObservation({
    targetType: "agent",
    answer,
    runtimeEvents: events,
    traceEvents,
    vars: options.vars || {},
  });
  return {
    run_id: runID,
    status,
    answer,
    judge_observation: judgeObservation,
    judge_observation_text: JSON.stringify(judgeObservation, null, 2),
    eval_run: evalRun,
    links: evalRun.links,
    runtime_events: events,
    trace_events: traceEvents,
    artifact_manifest: buildArtifactManifest(runID, traceEvents, events, {
      protocolVersion: options.protocolVersion,
    }),
    trace: (!isArrayOutput && turnOutput?.trace) || {},
    metrics,
  };
}

function findEventSource(events) {
  for (const event of events) {
    if (typeof event?.source === "string" && event.source.trim() !== "") {
      return event.source;
    }
  }
  return null;
}

/**
 * Normalizes a candidate token value: only a non-empty, non-whitespace
 * string counts as "configured". Everything else (undefined, null,
 * false, 0, "", "   ") is treated as not configured, so callers can chain
 * `??` across resolution layers without an empty/blank value from one
 * layer masking a real value further down the chain.
 *
 * Returns the *trimmed* string, not the raw candidate. This matters: env
 * vars and secret files commonly carry trailing whitespace/newlines
 * (e.g. a secrets file read with a trailing "\n", or a `.env` value with
 * a trailing space), while Node's http module strips trailing OWS
 * (RFC 7230) from incoming header values before handlers see them. If we
 * stored the untrimmed candidate, a client sending the correctly-trimmed
 * `Authorization: Bearer <token>` would never match a token that still
 * had trailing whitespace baked in -- silently locking out every
 * legitimate request instead of failing open OR closed cleanly.
 */
function resolveConfiguredToken(candidate) {
  if (typeof candidate !== "string") {
    return undefined;
  }
  const trimmed = candidate.trim();
  return trimmed === "" ? undefined : trimmed;
}

function isEvalRunCollection(url) {
  const parsed = new URL(url, "http://127.0.0.1");
  return parsed.pathname === "/v1/eval/runs";
}

const BEARER_PREFIX_PATTERN = /^bearer /i;

/**
 * `token` here has already been through `resolveConfiguredToken`, so it
 * is either undefined (no token configured anywhere -> fail-open, opt-in
 * auth) or a genuinely non-empty, already-trimmed string. We still guard
 * against a malformed/missing Authorization header producing a false
 * match (an absent header is `undefined`, which can never equal the
 * `Bearer ...` string, but this keeps the comparison explicit and immune
 * to header value coercion surprises).
 *
 * The `Bearer` scheme name is matched case-insensitively per RFC 6750 /
 * HTTP's general case-insensitivity for auth schemes (a client sending
 * `bearer <token>` is spec-compliant and must not be rejected just
 * because of casing); only the token value itself is compared exactly.
 */
function isAuthorized(request, token) {
  if (!token) {
    return true;
  }
  const authorizationHeader = request.headers.authorization;
  if (typeof authorizationHeader !== "string") {
    return false;
  }
  if (!BEARER_PREFIX_PATTERN.test(authorizationHeader)) {
    return false;
  }
  const presentedToken = authorizationHeader.slice(authorizationHeader.indexOf(" ") + 1);
  return presentedTokenMatches(presentedToken, token);
}

/**
 * Compares the presented header token against the configured token at
 * the byte level, not the JS-string level. Node's http module decodes
 * incoming header bytes as latin1 (one JS char per raw byte), while
 * `process.env` (and any JS string literal / JSON payload) is decoded as
 * UTF-8. For an ASCII-only token both decodings agree, so this is a
 * no-op difference in the common case (tokens are usually
 * base64/hex/UUID-like). But if the token contains non-ASCII characters,
 * naively comparing the two JS strings compares mismatched encodings of
 * the same bytes and never succeeds -- a correctly-presented token would
 * be rejected forever, the same class of "configured but unusable"
 * lockout as the trailing-whitespace issue this SDK already guards
 * against. Re-encoding the presented header value's JS string back to
 * latin1 recovers the original bytes the client actually sent, which can
 * then be compared against the UTF-8 bytes of the configured token.
 */
function presentedTokenMatches(presentedToken, configuredToken) {
  const presentedBytes = Buffer.from(presentedToken, "latin1");
  const configuredBytes = Buffer.from(configuredToken, "utf8");
  return presentedBytes.equals(configuredBytes);
}

function parseEvalRunRoute(url) {
  const parsed = new URL(url, "http://127.0.0.1");
  const match = parsed.pathname.match(/^\/v1\/eval\/runs\/([^/]+)(?:\/(events|artifacts))?$/);
  if (!match) {
    return null;
  }
  return {
    runID: decodeURIComponent(match[1]),
    child: match[2] || "",
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error("request body too large"));
        request.destroy();
      }
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function sendJSON(response, status, body) {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}
