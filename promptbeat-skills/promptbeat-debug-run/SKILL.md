---
name: promptbeat-debug-run
description: Use when Promptbeat validate, config inspect, generate, run, eval, report, provider-file loading, environment variables, working_dir, promptfoo, or coding-agent runtime execution fails.
---

# Promptbeat Debug Run

## Overview

Diagnose the failing boundary first: project config, provider override, generated
promptfoo YAML, target runtime, promptfoo execution, result parsing, or report
input.

## Triage Table

| Symptom | First check |
| --- | --- |
| `missing required --config` | The command needs `--config <path>`. |
| `missing required --output-dir` | `promptbeat run` and `promptbeat eval` require `--output-dir`. |
| `validate config` failure | Run `./bin/promptbeat config inspect --config <promptbeat.yaml>` if validation gets far enough. |
| `working_dir does not exist` | Run from repository/release root or use an absolute `working_dir`. |
| Env template failure | Export the referenced env var; do not paste secrets into YAML. |
| Generated cases exist but eval fails | Check whether the config is Promptbeat project YAML or generated promptfoo YAML. |
| Report fails to parse input | Confirm the input is `evaluation_result.json` or promptfoo-compatible result JSON. |
| Coding-agent returns no trace | Check adapter trace settings and runtime support. |

## Command Boundary

- `promptbeat validate --config <promptbeat.yaml>` validates a Promptbeat project.
- `promptbeat generate --config <promptbeat.yaml> --output <cases.json>` writes
  generated cases only.
- `promptbeat run --config <promptbeat.yaml> --output-dir <dir>` runs a
  Promptbeat project pipeline.
- `promptbeat eval --config <promptfoo.yaml> --output-dir <dir>` runs an existing
  promptfoo YAML.
- `promptbeat report --input <evaluation_result.json>` renders a report.

## Load Detailed Fixes

Use `references/common-failures.md` for concrete fixes and example commands.

## Common Mistakes

- Do not recommend changing model credentials before checking path and command
  type errors.
- Do not ask the user to commit secrets or paste API keys into YAML.
- Do not treat a provider template as a working target until a real runtime has
  produced artifacts.
