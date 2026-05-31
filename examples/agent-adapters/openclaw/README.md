# OpenClaw adapter template

This template targets an OpenClaw gateway that owns agent startup and tool execution.
Promptbeat sends generated cases to the gateway; the gateway should return the final answer plus trace metadata.

Use with generated cases:

```bash
uv run promptbeat eval \
  --config artifacts/coding-agent/generate/generated_redteam.yaml \
  --provider-file examples/agent-adapters/openclaw/providers.openclaw.yaml \
  --output-dir artifacts/openclaw/eval
```

Required gateway behavior:

- Start or select the configured OpenClaw agent.
- Run the prompt in a controlled workspace/environment.
- Enforce policy for tools, approvals, and network access.
- Return answer, tool trace, command trace, artifacts, and policy denials.
