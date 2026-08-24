# agentbeat-sdk

`agentbeat-sdk` is a small, zero-dependency JavaScript SDK for agent
developers who want to report observability data (`trace_events`,
`tool_call`, `file_diff`, `env_change`, etc.) into the Promptbeat
evaluation pipeline. It also exposes a generic HTTP server skeleton for
exposing your agent as a Promptbeat EvalRun target.

This package holds the *generic* building blocks shared by every
Promptbeat agent adapter. It was extracted from the Codex app-server
adapter (`examples/codex_agent/app-server-adapter/adapter.mjs`); anything
specific to a single agent protocol (Codex app-server JSON-RPC, sandbox
policies, provider credential resolution, etc.) stays in that adapter,
not here.

## TypeScript quick start

The public AI Beat repository includes this typed, zero-dependency SDK. Define
an adapter in TypeScript:

```ts
import {
  defineAdapter,
  type AdapterRunInput,
} from "./sdk/agentbeat-sdk-js/src/index.mjs";

const registration = defineAdapter({
  id: "my-company/my-agent",
  version: "1.0.0",
  capabilities: ["text", "trace-events"],
  async runTurn(input: AdapterRunInput) {
    return [
      { event_type: "run_started", source: "my-agent" },
      {
        event_type: "agent_response_delta",
        source: "my-agent",
        delta: await runMyAgent(input.prompt),
      },
    ];
  },
});

registration.createEvalServer().listen(
  Number(process.env.AGENTBEAT_ADAPTER_PORT ?? "8091"),
  process.env.AGENTBEAT_ADAPTER_HOST ?? "127.0.0.1",
);
```

Register its launch command in `agentbeat-adapter.json`:

```json
{
  "schema_version": "agentbeat.adapter.v1",
  "id": "my-company/my-agent",
  "version": "1.0.0",
  "capabilities": ["text", "trace-events"],
  "launch": {
    "command": ["node", "adapter.ts"]
  }
}
```

Check the registration and EvalRun response without running a full evaluation:

```bash
agentbeat adapter check --adapter agentbeat-adapter.json
```

The manifest and HTTP protocol are language-neutral. See the public
TypeScript, Python, and Go implementations in
`examples/agent-adapters/minimal/`.

## The trace-event-v1 contract

Every event you report must eventually be shaped into a `TraceEvent` that
conforms to `datasets/schemas/trace-event-v1.schema.json`:

- Required fields: `event_type` (string), `source` (string), `timestamp_ms`
  (number). `timestamp_ms` must be a `number` -- `null` is not valid, so
  the SDK always falls back to `Date.now()` when no timestamp is present
  on the source event (see `buildTraceEvents` below).
- `event_type` is constrained by a JSON Schema `enum` to 12 standard
  values: `run_started`, `turn_started`, `agent_response_delta`,
  `command_exec_observed`, `command_result_observed`,
  `tool_call_executed`, `tool_result_returned`, `file_diff`,
  `tool_progress_observed`, `run_finished`, `final_answer`, `error`.
- The schema declares `additionalProperties: true`, so you can attach any
  extra *fields* you need on top of the required three (e.g.
  `env_before`/`env_after`, `tool_name`, `arguments`, ...). This does
  **not** relax the `enum` constraint on `event_type` -- a strict
  validator will still reject any `event_type` value outside the 12
  listed above. See the `recordEnvChange` note below for a case where
  this SDK intentionally emits a non-enum `event_type` anyway.

The SDK's `buildTraceEvents(runtimeEvents, runID, options)` wraps your raw
events into the storage envelope Promptbeat expects (`id`, `run_id`,
`event_index`, `event_type`, `source`, `timestamp_ms`, `payload`).
`options.defaultSource` (default `"agentbeat-sdk"`) is used for events
that don't carry their own `source`.

## Quick start: TraceCollector

The easiest way to report observability data is `TraceCollector`. Create
one per agent run, call `record*` as your agent takes actions, then
convert to trace events or a judge observation when the run finishes:

```js
import { TraceCollector } from "agentbeat-sdk";

const collector = new TraceCollector("run_123", { source: "my-agent" });

collector.recordToolCall("search_web", { query: "weather in nyc" });
collector.recordToolResult("search_web", { hits: 3 });
collector.recordFileDiff("src/app.js", "-old line\n+new line");
collector.recordEnvChange({ DEBUG: "0" }, { DEBUG: "1" });

try {
  // ... your agent logic ...
} catch (error) {
  collector.recordError(error);
}

// TraceEvent records ready to persist / send to Promptbeat.
const traceEvents = collector.toTraceEvents();

// A full judge observation payload (answer + trace + runtime events + vars).
const observation = collector.buildObservation("The weather is sunny.", {
  scenario_id: "weather_lookup",
});
```

### `TraceCollector` methods

| Method | Produces |
| --- | --- |
| `recordToolCall(name, args)` | `tool_call_executed` event |
| `recordToolResult(name, result)` | `tool_result_returned` event |
| `recordFileDiff(path, diff)` | `file_diff` event |
| `recordEnvChange(before, after)` | `env_change` event (see note below) |
| `recordError(error)` | `error` event (message derived via `describeError`) |
| `toRuntimeEvents()` | raw recorded events, in order |
| `toTraceEvents()` | schema-conformant `TraceEvent[]` via `buildTraceEvents` |
| `buildObservation(answer, vars)` | a judge observation payload via `buildJudgeObservation` |

**Note on `recordEnvChange`:** `trace-event-v1`'s `event_type` enum has no
dedicated "environment changed" value; the 12 values listed above are the
full list. `recordEnvChange` emits `event_type: "env_change"` anyway, as
a **deliberate, non-standard extension**, carrying the before/after
snapshots in the `env_before` and `env_after` fields.

To be precise about why this is allowed at all: `additionalProperties:
true` on the schema only permits extra *field names* beyond the ones the
schema declares (which is why `env_before`/`env_after` are fine) -- it
does **not** relax the `enum` constraint on the `event_type` field
itself. In other words, `additionalProperties` is not the reason
`"env_change"` is tolerated; nothing in the schema actually permits it.
Any consumer that strictly validates `event_type` against the schema's
`enum` **will reject** an `"env_change"` event. If your downstream
pipeline does strict schema validation, either:

- treat `"env_change"` as filtered out / logged separately, not fed
  through the strict validator, or
- fold environment-change information into an existing enum value
  instead (e.g. attach `env_before`/`env_after` as extra fields on a
  `tool_result_returned` or `run_started` event) rather than using
  `recordEnvChange`.

`recordEnvChange` exists for convenience when your pipeline doesn't do
strict enum validation, or validates leniently; it is intentionally
outside the guaranteed-standard event set.

## Low-level building blocks

If you need more control than `TraceCollector` gives you, the individual
functions are also exported directly from `agentbeat-sdk`:

- **`trace.mjs`**: `buildTraceEvents(runtimeEvents, runID)`,
  `collectFinalAnswer(events)`, `parseJsonLines(chunk, previousRemainder)`,
  `describeError(error)`.
- **`judge.mjs`**: `buildJudgeObservation({ targetType, answer,
  runtimeEvents, traceEvents, vars })`, plus its helpers
  `sanitizeJudgeVars(vars)`, `summarizeTraceEvents(traceEvents)`,
  `incrementCount(counts, value)`.
- **`evalRun.mjs`**: `buildEvalRunLinks(runID)`, `buildEvalRun(runID,
  status, metrics, options)`, `buildArtifactManifest(runID, traceEvents,
  runtimeEvents, options)`. `protocol_version` defaults to
  `"agentbeat.eval.v1"` and `target` defaults to `"agent"`; pass
  `options.protocolVersion` / `options.target` to override.
- **`server.mjs`**: `createEvalServer({ token, tokenEnvVar, adapterName,
  defaultSource, protocolVersion, target, runTurn })`.

All of the above are also re-exported from `src/index.mjs`.

## Exposing your agent as an EvalRun HTTP target

`createEvalServer` gives you the standard Promptbeat EvalRun HTTP
surface without tying you to any specific agent runtime. You provide a
`runTurn` function; the SDK owns routing, auth, in-memory run storage, and
building the `TraceEvent` / `EvalRun` / judge-observation output:

```js
import { createEvalServer } from "agentbeat-sdk";

const server = createEvalServer({
  token: process.env.MY_AGENT_EVAL_TOKEN,  // optional explicit bearer token
  // Or, instead of passing `token`, just set the default env var
  // AGENTBEAT_EVAL_TOKEN (or point tokenEnvVar at your own env var name)
  // and the server will pick it up automatically -- see "Auth" below.
  adapterName: "my-agent-adapter",         // reported at GET /health
  async runTurn({ prompt, runtime, runID, vars }) {
    // Drive your own agent runtime here and return either:
    //   1. an array of raw runtime events, or
    //   2. { runtimeEvents, status, source, trace } for more control
    //      over the terminal status ("completed"/"failed") and trace
    //      metadata returned alongside the run.
    return [
      { event_type: "run_started", source: "my-agent" },
      { event_type: "agent_response_delta", source: "my-agent", delta: "Hi!" },
    ];
  },
});

server.listen(8091, "127.0.0.1");
```

Routes exposed:

- `GET /health`
- `POST /v1/eval/runs` — starts a run (`{ prompt, runtime, run_id, vars }`)
- `GET /v1/eval/runs/:runID`
- `GET /v1/eval/runs/:runID/events`
- `GET /v1/eval/runs/:runID/artifacts`

### Auth

All `/v1/eval/runs*` routes are protected with a Bearer token, resolved in
this order:

1. `options.token`, if passed explicitly and non-empty.
2. `process.env[options.tokenEnvVar]`, if `options.tokenEnvVar` is set
   *and* that env var resolves to a non-empty value.
3. `process.env.AGENTBEAT_EVAL_TOKEN` (the default env var name), if it
   resolves to a non-empty value.

These are chained fallbacks, not a one-or-the-other choice: step 3 is
still checked even when `options.tokenEnvVar` is set at step 2, as long
as step 2's env var itself is unset. This matters for adapters that need
their own env var name for backward compatibility (e.g. a Codex adapter
passing `tokenEnvVar: "CODEX_APP_SERVER_EVAL_TOKEN"`) -- doing so does
not silently disable the shared `AGENTBEAT_EVAL_TOKEN` fallback that ops
tooling may rely on.

"Non-empty" specifically means: a string that isn't `""` and isn't
whitespace-only after trimming. A declared-but-empty env var (`FOO=` in
Docker/Compose/K8s, `export FOO="$UNSET"` where `$UNSET` was never set,
etc.) or an explicit `token: ""` does **not** count as configured at
that layer -- resolution falls through to the next layer instead of
silently disabling auth for that request. Non-string values passed as
`options.token` (`null`, `false`, `0`, `undefined`) are likewise treated
as not configured. `options.tokenEnvVar` itself must be a non-empty
string to be used as an env var name; other types (e.g. an array) are
ignored rather than being coerced into a property key.

The value used at each layer is also **trimmed** before being stored as
the effective token. This matters because a token loaded from a secrets
file or a `.env` value commonly carries trailing whitespace/newlines
(`"s3cret\n"`), while Node's `http` module strips trailing OWS
(RFC 7230) from incoming header values before your handler sees them --
without trimming, a correctly-formed `Authorization: Bearer s3cret`
request from a well-behaved client would never match, permanently
locking out every legitimate request rather than failing open or closed
cleanly.

The `Bearer` scheme name in the `Authorization` header is matched
case-insensitively (`bearer`, `BEARER`, `Bearer` are all accepted, per
HTTP's general case-insensitivity for auth scheme names); the token
value itself is still compared exactly (case-sensitive).

Token comparison is done at the byte level, not the JS-string level.
Node's `http` module decodes incoming header bytes as latin1, while
`process.env` (and JS string literals) decode as UTF-8; for an
ASCII-only token both decodings agree, but a token containing non-ASCII
characters would otherwise never match a correctly-presented header,
permanently locking out legitimate requests. The presented header value
is re-encoded back to raw bytes and compared against the UTF-8 bytes of
the configured token, so non-ASCII tokens work correctly too (tokens are
typically base64/hex/UUID-like and therefore ASCII-only in practice, but
this is handled either way).

`createEvalServer` also tolerates `options` being passed as `null`,
`0`, `""`, `false`, or an array -- any of these produce the same clean
"requires options.runTurn to be a function" error as a missing
`runTurn`, rather than a bare `TypeError`.

If none of the three layers resolve to a non-empty value, the routes are
left unauthenticated (matching this SDK's fail-open default for local/dev
use -- pass a token or set an env var for anything reachable outside
localhost). Because steps 2/3 read from `process.env` at server-creation
time, simply exporting `AGENTBEAT_EVAL_TOKEN` before starting your server
is enough to enable auth without wiring `options.token` through yourself.
This SDK is protocol-agnostic and does not assume a Codex-specific env
var name as the only option; use `options.tokenEnvVar` if you also want
your adapter's own name checked (e.g. `"MY_AGENT_EVAL_TOKEN"`).

## Testing

```
node --test sdk/agentbeat-sdk-js/test/*.test.mjs
```

No third-party test framework is used -- tests are plain `node:test` +
`node:assert/strict`, matching the rest of this repo's adapter code.
