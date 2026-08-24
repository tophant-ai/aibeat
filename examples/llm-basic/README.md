# LLM basic example

This example evaluates one chat model target against hand-written Promptbeat seeds.
It is the smallest release-package example for users who want to test a normal LLM before connecting an agent.

Configure provider roles before running commands:

```bash
export ATTACKER_MODEL_NAME="openai:gpt-4o"
export ATTACKER_BASE_URL="https://api.openai.com/v1"
export ATTACKER_API_KEY="sk-..."

export JUDGE_MODEL_NAME="openai:gpt-4o"
export JUDGE_BASE_URL="https://api.openai.com/v1"
export JUDGE_API_KEY="sk-..."

export TARGET_MODEL_NAME="openai:gpt-4o-mini"
export TARGET_BASE_URL="https://api.openai.com/v1"
export TARGET_API_KEY="sk-..."
```

Validate:

```bash
./bin/promptbeat validate --config examples/llm-basic/promptbeat.yaml
```

Generate attack cases:

```bash
./bin/promptbeat generate \
  --config examples/llm-basic/promptbeat.yaml \
  --count 5 \
  --output artifacts/llm-basic/generated_cases.json
```

Run the full Promptbeat + Promptfoo path:

```bash
./bin/promptbeat run \
  --config examples/llm-basic/promptbeat.yaml \
  --output-dir artifacts/llm-basic/run
```

The attacker generates adversarial prompts, the judge scores target responses, and the target is the model under test. These roles can use the same model gateway or separate gateways. Do not commit API keys into YAML.
