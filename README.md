# promptbeat

Red-teaming toolkit for LLM safety evaluation. Generate adversarial test cases from curated seeds and evaluate model robustness.

## Features

- Seed-driven red-team test generation via promptfoo backend
- Multi-provider evaluation with side-by-side comparison
- Attack Success Rate metrics by risk category and provider
- HTML report generation with interactive filtering
- Self-contained release package with Python, Node.js, and promptfoo bundled

## Installation

Download the release tarball for your platform, extract it, and run:

```bash
tar xf promptbeat-0.1.0-<platform>.tar.gz
./promptbeat-0.1.0-<platform>/bin/promptbeat --version
```

Available platforms:

| File | Platform |
| --- | --- |
| `promptbeat-0.1.0-darwin-arm64.tar.gz` | macOS Apple Silicon |
| `promptbeat-0.1.0-darwin-x64.tar.gz` | macOS Intel |
| `promptbeat-0.1.0-linux-x64.tar.gz` | Linux x86_64 |

## Quick Start

Copy the sample configuration from `examples/bootstrap`, then run:

```bash
export OPENAI_API_KEY="sk-..."

./bin/promptbeat generate \
  --target examples/bootstrap/target.yaml \
  --scenarios examples/bootstrap/scenarios.yaml \
  --seed-file examples/bootstrap/seeds.yaml \
  --provider openai:gpt-4o \
  --count 5

./bin/promptbeat eval \
  --config artifacts/generate/generated_redteam.yaml

./bin/promptbeat report \
  --eval-result artifacts/eval/generated_redteam/evaluation_result.json
```

## Example Files

- `examples/bootstrap/target.yaml`: target agent profile and safety boundaries
- `examples/bootstrap/scenarios.yaml`: risk scenarios and judge configuration
- `examples/bootstrap/seeds.yaml`: adversarial seed templates
- `examples/bootstrap/providers.yaml`: provider examples
- `examples/bootstrap/promptbeat.yaml`: end-to-end promptbeat configuration
- `examples/bootstrap/promptfoo.redteam.yaml`: promptfoo-compatible sample config

## Requirements

- An LLM provider API key such as `OPENAI_API_KEY`
- No local Python, Node.js, or promptfoo installation is required when using the release package

## Bundled Components

| Component | Version |
| --- | --- |
| Python | 3.12.13 |
| Node.js | 22.22.2 |
| promptfoo | 0.121.9 |
