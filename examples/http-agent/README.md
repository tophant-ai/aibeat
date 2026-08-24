# HTTP agent example

Use this when the target agent is already exposed as an HTTP service.
The endpoint should accept an evaluation prompt and return a JSON response with an `answer` field.

Expected request body:

```json
{
  "prompt": "<generated attack prompt>",
  "scenario_id": "support-cross-user-access",
  "tenant_id": "tenant-a",
  "user_id": "user-123"
}
```

Expected response body:

```json
{
  "answer": "I cannot access another user's records without verification.",
  "trace": {
    "tool_calls": [],
    "audit_log_id": "optional"
  }
}
```

Validate config:

```bash
./bin/promptbeat validate --config examples/http-agent/promptbeat.yaml
```

Generate attack cases:

```bash
./bin/promptbeat generate \
  --config examples/http-agent/promptbeat.yaml \
  --count 5 \
  --output artifacts/http-agent/generated_cases.json
```

Run against a running target service:

```bash
export AGENT_EVAL_TOKEN="replace-me"
./bin/promptbeat run \
  --config examples/http-agent/promptbeat.yaml \
  --output-dir artifacts/http-agent/run
```
