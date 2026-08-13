---
name: promptbeat-run-quick-eval
description: Use when a user has a Promptbeat config or generated promptfoo config and wants to validate, generate a few cases, run a first small evaluation, inspect artifacts, or create a report.
---

# Promptbeat Run Quick Eval

## Overview

Assume the user is in a downloaded full Promptbeat package root. Pick the
correct command path based on input type before giving commands. Project configs
use `run`; generated promptfoo YAML uses `eval`.

## Command Choice

| Input | Command |
| --- | --- |
| A. Promptbeat project config such as `examples\http-agent\promptbeat.yaml` | `.\bin\promptbeat.cmd validate --config <promptbeat.yaml>` then `.\bin\promptbeat.cmd run --config <promptbeat.yaml> --output-dir <dir>` |
| B. User only wants generated cases | `.\bin\promptbeat.cmd generate --config <promptbeat.yaml> --count <n> --output <cases.json>` |
| C. Existing generated promptfoo YAML such as `generated_redteam.yaml` | `.\bin\promptbeat.cmd eval --config <promptfoo.yaml> --output-dir <dir>` |
| D. Existing result JSON | `.\bin\promptbeat.cmd report --input <evaluation_result.json-or-promptfoo-result.json> --output <report.html>` |

## Safe First Run

1. Ask or infer which input type the user has.
2. For a Promptbeat project config, validate first, then run with a small output
   directory under `artifacts\`.
3. Use `generate` only when the user wants to inspect cases before hitting the
   target. State that it writes cases JSON only; it does not evaluate the target
   and does not produce promptfoo YAML.
4. Use `eval` only with an existing generated promptfoo YAML. Add
   `--provider-file <providers.yaml>` if the user needs a provider override.
   Direct `eval` writes Promptfoo artifacts such as `promptfoo-result.json`; do
   not imply it writes Promptbeat `evaluation_result.json` or `report.html`.
   Do not say `promptbeat generate` creates this YAML; `generate` creates cases
   JSON only.
5. Use `report` when the user already has a result JSON: either Promptbeat
   `evaluation_result.json` from `run`, or raw Promptfoo `promptfoo-result.json`
   from direct `eval`. `--eval-result` is also accepted by the CLI, but
   `--input` is the clearest flag for either file.
6. Point the user to `evaluation_result.json`, `report.html`, and trace artifacts
   only when the command path can produce or has produced them.

Unix equivalent: `./bin/promptbeat` maps to `.\bin\promptbeat.cmd`; mention it
briefly only when useful.

## Load Detailed Recipes

Use `references/cli-recipes.md` for command templates.

## Common Mistakes

- Do not use source-checkout commands or `go run` in this skill.
- Do not use `.\bin\promptbeat.exe`; use the full-package wrapper
  `.\bin\promptbeat.cmd`.
- Do not make `generate` a mandatory step before `run`.
- Do not pass a Promptbeat project YAML to `eval`.
- Do not pass generated cases JSON to `eval`.
- Do not say `promptbeat generate` creates generated promptfoo YAML.
- Do not use `--output` with `run` or `eval`; both require `--output-dir`.
- Do not assume a report exists unless `run` produced it or `report` was invoked.
- Do not tell users to rerun `run` just because they have direct `eval`
  `promptfoo-result.json`; `report --input` can parse it.
- Do not hand-write provider YAML when a placeholder or existing provider-file
  example answers the user's question.
