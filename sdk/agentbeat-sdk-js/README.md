# AgentBeat JavaScript SDK

This package is the collection-side SDK for JavaScript Agents. It standardizes
how an existing Agent exposes the AI Beat Target protocol and exports bounded,
redacted `target-evidence-v1` observations.

The SDK does not load Cases, choose a model or environment, create EvalRuns,
call a Judge or calculate scores. Those remain AI Beat Go Core responsibilities.
An Agent may run at L1 without Evidence; enabling the collector adds L2. L3
state is produced independently by the registered State Controller.

## Use the bundled 1.0.0 source

AIBeat CLI 0.4.0 bundles this SDK as source; this release does **not** claim an
npm registry publication. Node 18+ is required for your Target, not the evaluator.
From the extracted AgentBeat root, the ready-to-run `examples/sdk-target/target.mjs`
imports `../../sdk/agentbeat-sdk-js/src/node.mjs` directly, with no install step.
In your own project, install the local directory (`npm install /absolute/path/to/sdk/agentbeat-sdk-js
--ignore-scripts --no-audit --no-fund`) before using the package-name imports below.
Provide a token locally, bind to loopback for demos, and collect real tool events
before claiming L2; the CLI/SDK versions are independent.

## Smallest Target

```js
import { createTargetServer } from "agentbeat-sdk/node";

const server = createTargetServer({
  targetId: "target-my-agent",
  auth: targetBearerToken,
  evidence: { source: "my-agent", observedChannels: ["messages", "tools"] },
  async invoke({ input, observe }) {
    const result = await myExistingAgent(input.text);
    observe?.message({ role: "assistant", text: result.answer });
    return { finalResponse: result.answer };
  },
});

server.listen(8091, "0.0.0.0");
```

The server owns only the customer-side transport:

```text
GET  /healthz
POST /v1/agent/invocations
GET  /v1/evidence/{run_id}   # when Evidence is enabled
```

It validates correlation headers, rejects request-side model/tool/secret/runtime
overrides, limits concurrency and request size, and rejects Run ID replay.
The in-process replay window is bounded by `maxClaimedRuns` (default 10,000,
and never smaller than `maxConcurrentRuns`). Deployments that require durable
replay protection across process restarts should enforce it in their external
run store as well.

## Collector

For an Agent that already exposes HTTP, use only `EvidenceCollector`:

```js
import { EvidenceCollector } from "agentbeat-sdk";

const observe = new EvidenceCollector({
  runId: invocation.run_id,
  caseId: invocation.case_id,
  source: "my-agent",
  observedChannels: ["messages", "tools"],
});

observe.toolCall({ callId: "call-1", name: "search", arguments: { query: "rent" } });
observe.toolResult({ callId: "call-1", name: "search", result: { hits: 1 } });
observe.message({ role: "assistant", text: "Done" });

const evidence = observe.finalize();
```

Every tool result must bind one earlier call ID with the same name. Events and
documents have configurable byte/count/depth limits; canonical L2 Evidence
always declares `messages` and `tools`, optionally `files`, and contains 1–5,000
events. Common authorization, password, credential, API-key and `*_token` /
`*Token` fields are recursively redacted before storage.

## Codex app-server

The Codex adapter only translates app-server JSON-RPC notifications into the
same collector calls:

```js
import { observeCodexNotification } from "agentbeat-sdk/adapters/codex-app-server";

onCodexNotification((notification) => {
  observeCodexNotification(notification, observe);
});
```

It contains no model, MCP, workspace, sandbox, HTTP Target, EvalRun or scoring
logic. The complete thin wrapper is in
`examples/customer-managed-codex-target/src/target-server.mjs`.

## Package exports

- `agentbeat-sdk`: `EvidenceCollector`, `BoundedEvidenceStore`,
  `buildTargetEvidence`;
- `agentbeat-sdk/node`: canonical Node Target server and bearer-token helper;
- `agentbeat-sdk/adapters/codex-app-server`: Codex notification projection;
- `agentbeat-sdk/legacy`: explicit compatibility exports for the old
  SDK-hosted EvalRun/Judge flow. New integrations must not use this subpath.

## Verification

```bash
cd sdk/agentbeat-sdk-js
npm test
```
