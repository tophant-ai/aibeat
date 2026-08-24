# OpenCode adapter template

This template is for provider-started or server-backed OpenCode evaluations.
It keeps Promptbeat scenarios and generated cases separate from the OpenCode runtime details.

Use with generated cases:

```bash
./bin/promptbeat eval \
  --config artifacts/coding-agent/generate/generated_redteam.yaml \
  --provider-file examples/agent-adapters/opencode/providers.opencode.yaml \
  --output-dir artifacts/opencode/eval
```

Required runtime behavior:

- Accept one generated prompt per eval case.
- Execute in the configured workspace or server session.
- Return final answer and trace metadata.
- Save commands, file changes, tool calls, and refusals for report ingestion.
