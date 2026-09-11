# AgentBeat Python SDK

This package is the collection-side SDK for Python Agents. It gives an existing
Agent two optional building blocks:

- `EvidenceCollector`: records bounded, redacted message/tool/file observations
  and exports canonical `target-evidence-v1`;
- `create_target_server`: exposes the standard AI Beat Target HTTP surface
  around one existing `invoke(context)` function.

It does not load Cases, choose a model or environment, call a Judge, calculate a
score, or create an EvalRun. Those remain Go Core responsibilities. An Agent can
join at L1 without collecting Evidence; using the collector adds L2 visibility.
L3 state and native-oracle Evidence still comes from the evaluator-controlled
State Controller, not from this SDK.

## Use the bundled 1.0.0 source

AIBeat CLI 0.4.0 bundles this SDK as source; this release does **not** claim a
PyPI publication. Python 3.11+ is required for your Target, not the evaluator.
The ready-to-run `examples/sdk-target/target.py` resolves the bundled `src/`
automatically, with no package download. For another script, put the absolute
`sdk/agentbeat-sdk-py/src` directory on `PYTHONPATH` before using the imports below.
Provide a token locally and collect real events before claiming L2; the CLI and
SDK versions are independent.

## Smallest Target

```python
from agentbeat_sdk import create_target_server

def invoke(context):
    answer = my_existing_agent(context.text)
    if context.observe is not None:
        context.observe.message(role="assistant", text=answer)
    return {"final_response": answer}

server = create_target_server(
    target_id="target-my-agent",
    auth=target_bearer_token,
    invoke=invoke,
    evidence={"source": "my-agent", "observed_channels": ["messages", "tools"]},
)
server.serve_forever()
```

The server owns only these customer-side routes:

```text
GET  /healthz
POST /v1/agent/invocations
GET  /v1/evidence/{run_id}   # present when Evidence is enabled
```

The accepted invocation is strict `target-invocation-v1`. Model URLs, tokens,
workspaces, tools, fixtures, state controllers and other runtime choices cannot
be supplied in its metadata. A Run ID is accepted once so a failed request
cannot silently replay side effects.
The in-process replay window is bounded by `max_claimed_runs` (default 10,000).
Deployments that require durable replay protection across process restarts
should enforce it in their external run store as well.

Canonical L2 Evidence always declares `messages` and `tools`, optionally
`files`, and contains 1–5,000 events. The default recursive redactor covers
authorization, password, credential, API-key and `*_token` / `*Token` fields;
applications can still supply a stricter deployment-specific redactor.

## Framework adapters

`LangGraphObserver` is imported eagerly. The others resolve lazily so the core
SDK stays dependency-free — install the matching framework only in the
deployment that uses that adapter.

| Framework | Adapter | Example |
|---|---|---|
| LangGraph | `LangGraphObserver` | `examples/customer-managed-langgraph-target` |
| OpenAI Agents | `OpenAIAgentsTracingProcessor` + `observe_openai_agents_run` | `examples/customer-managed-openai-agents-target` |
| LangChain | `LangChainCallbackHandler` / `AsyncLangChainCallbackHandler` | `examples/customer-managed-langchain-target` |
| OpenTelemetry GenAI | `OTelGenAISpanProcessor` | `examples/customer-managed-otel-target` |

`LangGraphObserver` projects completed messages from normal
`stream_mode="updates"` output:

```python
from agentbeat_sdk.adapters import LangGraphObserver

observer = LangGraphObserver(context.observe)
for update in graph.stream(graph_input, stream_mode="updates"):
    observer.observe_stream_part(update)
answer = observer.final_response
```

The adapter observes `AIMessage.tool_calls`, matching `ToolMessage` results and
assistant messages. It does not require graph nodes to import AI Beat and does
not replace LangGraph callbacks, checkpoints, models or tools.

OpenAI Agents processors are process-global; wrap each run with
`observe_openai_agents_run` so concurrent runs do not mix evidence. LangChain
handlers must be attached at the root `RunnableConfig`. The OTel processor is a
best-effort fallback: GenAI content fields are opt-in, and it never installs a
global `TracerProvider`.

## Verification

```bash
PYTHONPATH=sdk/agentbeat-sdk-py/src \
  python -m unittest discover -s sdk/agentbeat-sdk-py/tests -v
```
