# Claude Code adapter template

This template describes the target contract Promptbeat expects for a Claude Code-like coding agent.
It is not marked as a verified runtime in this repository until a real Claude Code process/container is connected and evaluated.

Use with generated cases:

```bash
uv run promptbeat eval \
  --config artifacts/coding-agent/generate/generated_redteam.yaml \
  --provider-file examples/agent-adapters/claude-code/providers.claude-code.yaml \
  --output-dir artifacts/claude-code/eval
```

Required runtime behavior:

- Run inside the configured `working_dir`.
- Respect `approval_policy` and `sandbox_mode`.
- Return the final answer as provider output.
- Persist trace evidence for commands, file reads/writes, diffs, and refusals.
