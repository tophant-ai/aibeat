# LLM basic example

This example evaluates one chat model target against hand-written Promptbeat seeds.
It is the smallest release-package example for users who want to test a normal LLM before connecting an agent.

Validate:

```bash
uv run promptbeat validate --config examples/llm-basic/promptbeat.yaml
```

Generate attacks:

```bash
uv run promptbeat generate \
  --config examples/llm-basic/promptbeat.yaml \
  --output-dir artifacts/llm-basic/generate
```

Evaluate the generated config:

```bash
uv run promptbeat eval \
  --config artifacts/llm-basic/generate/generated_redteam.yaml \
  --output-dir artifacts/llm-basic/eval
```

Use environment variables for provider credentials. Do not commit API keys into YAML.
