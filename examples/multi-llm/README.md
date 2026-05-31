# Multi-LLM comparison example

This example keeps the same target profile, scenarios, and seeds while evaluating several LLM providers side by side.
Use it to compare risk behavior by provider in the final report.

Validate:

```bash
uv run promptbeat validate --config examples/multi-llm/promptbeat.yaml
```

Generate attacks:

```bash
uv run promptbeat generate \
  --config examples/multi-llm/promptbeat.yaml \
  --output-dir artifacts/multi-llm/generate
```

Evaluate:

```bash
uv run promptbeat eval \
  --config artifacts/multi-llm/generate/generated_redteam.yaml \
  --output-dir artifacts/multi-llm/eval
```

The generator model and target models are intentionally separate. Override the generator with `--generator-provider` or `PROMPTBEAT_GENERATOR_PROVIDER`.
