# Common Promptbeat Failures

## Command Uses the Wrong Config Type

Problem:

```text
promptbeat eval --config examples/http-agent/promptbeat.yaml
```

Fix:

```bash
./bin/promptbeat run \
  --config examples/http-agent/promptbeat.yaml \
  --output-dir artifacts/http-agent/run
```

Use `eval` only for generated promptfoo YAML:

```bash
./bin/promptbeat eval \
  --config artifacts/coding-agent/generate/generated_redteam.yaml \
  --output-dir artifacts/eval/run-001
```

## Missing `--output-dir`

Problem:

```text
missing required --output-dir
```

Fix:

```bash
./bin/promptbeat run \
  --config examples/llm-basic/promptbeat.yaml \
  --output-dir artifacts/llm-basic/run
```

## Codex `working_dir does not exist`

Likely cause: the command was not run from repository or release package root,
or `working_dir` in `examples/codex_agent/promptbeat.yaml` is relative to the
wrong current directory.

Fix:

```bash
cd <repo-or-release-root>
./bin/promptbeat validate --config examples/codex_agent/promptbeat.yaml
```

If needed, change `working_dir` to an absolute path in the local copy of the
provider config.

## Missing Environment Variable

Find the referenced `{{env.NAME}}` or `${NAME}` in the project config or provider
file. Export that variable in the shell that runs Promptbeat.

Examples:

```bash
export AGENT_EVAL_TOKEN="replace-me"
export OPENCLAW_GATEWAY_URL="https://..."
export OPENCLAW_API_KEY="..."
export OPENCLAW_AGENT_ID="..."
```

Do not commit real keys.

## Dataset Subscription Loads Nothing

Raw benchmark datasets are not bundled in release examples. Download the needed
datasets before expecting all subscription sources to load.

```bash
uv run python scripts/download_datasets.py --only harmbench jbb_behaviors do_not_answer simple_safety_tests beaver_tails
```

Then validate the subscription example:

```bash
./bin/promptbeat validate \
  --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml
```

## Report Input Is Wrong

Use `evaluation_result.json` from an eval/run output directory:

```bash
./bin/promptbeat report \
  --input artifacts/eval/run-001/evaluation_result.json \
  --output artifacts/eval/run-001/report.html
```

If `--output` is omitted, Promptbeat writes `report.html` next to the input.
