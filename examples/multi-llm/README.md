# Multi-LLM comparison example

This example keeps the same target profile, scenarios, and seeds while evaluating several LLM providers side by side.
Use it to compare risk behavior by provider in the final report.

Validate:

```bash
./bin/promptbeat validate --config examples/multi-llm/promptbeat.yaml
```

Generate attack cases:

```bash
./bin/promptbeat generate \
  --config examples/multi-llm/promptbeat.yaml \
  --count 5 \
  --output artifacts/multi-llm/generated_cases.json
```

Run the full Promptbeat + Promptfoo path:

```bash
./bin/promptbeat run \
  --config examples/multi-llm/promptbeat.yaml \
  --output-dir artifacts/multi-llm/run
```

The generator model and target models are intentionally separate in the project config.
