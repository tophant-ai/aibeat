---
name: promptbeat-select-risk-pack
description: Use when a user needs help choosing Promptbeat attack goals, risk types, scenarios, seed files, dataset subscriptions, compliance profiles, or a small smoke-test scope.
---

# Promptbeat Select Risk Pack

## Overview

Assume the user is in a downloaded full Promptbeat package root. Map their risk
intent to existing package examples, scenarios, seeds, or subscriptions. Prefer
inspection with `generate --count 5` before a full run.

Hard stop: if an answer mentions `risk-packs\`, `promptbeat-risk-packs\`,
`packs\`, `cases\`, `promptbeat -c`, `--pack`, or separate made-up YAMLs for
one risk, rewrite it using the package examples below.

## Current Starting Points

| Need | Use |
| --- | --- |
| Small hand-written LLM smoke / learning config | `examples\llm-basic\promptbeat.yaml` |
| HTTP business-agent authorization or refund abuse | `examples\http-agent\promptbeat.yaml` |
| Public safety dataset seeds | `examples\dataset-subscriptions\safety-baseline\promptbeat.yaml` |
| Reusable subscription catalog | `subscriptions\safety-baseline.yaml` |
| SCC / AI-WAF-oriented scenarios | `examples\scc_waf\promptbeat.yaml` |
| Coding-agent safety project | `examples\codex_agent\promptbeat.yaml` |

## Selection Flow

1. Ask one question and stop only if target class is unclear: normal LLM, HTTP
   business agent, coding agent, compliance, or dataset evaluation.
2. Choose an existing example path before suggesting custom YAML.
3. Use full-package Windows commands first:
   `.\bin\promptbeat.cmd validate --config <promptbeat.yaml>`.
4. For first inspection, use:
   `.\bin\promptbeat.cmd generate --config <promptbeat.yaml> --count 5 --output <cases.json>`.
5. Use `scenarios list` only for built-in registry discovery. It may be sparse;
   example-local `scenarios.yaml` and `seeds.yaml` are the primary source for
   packaged examples.
6. Warn that raw public datasets are not bundled before recommending dataset
   subscriptions.

Unix equivalent: `./bin/promptbeat` maps to `.\bin\promptbeat.cmd`; mention it
briefly only when useful.

## Risk Routing

| User intent | Recommend | Notes |
| --- | --- | --- |
| "Smallest example so I understand Promptbeat" | `examples\llm-basic` | Hand-written `t-007`, `t-002`, and `t-001` smoke seeds. |
| "HTTP support agent / business workflow" | `examples\http-agent` | `support-cross-user-access` (`t-001`) and `support-refund-abuse` (`t-008`). |
| "Public benchmark-style safety seeds" | `examples\dataset-subscriptions\safety-baseline` | Requires separate raw dataset files. |
| "SCC / AI-WAF-oriented scenarios" | `examples\scc_waf` | Start with `config inspect`, then generate a small case sample. |
| "Coding agent safety" | `examples\codex_agent\promptbeat.yaml` plus `promptbeat-connect-coding-agent` | Use the skill for runtime/provider wiring; use prebuilt Promptfoo YAML only with `promptbeat-run-quick-eval` / `eval`. |

## Command Rules

- Always make `cd C:\tools\promptbeat` the first line of package command blocks.
- Always use `.\bin\promptbeat.cmd`.
- Always use the long `--config` flag in this skill.
- Every `generate` command in this skill must include `--config`, `--count 5`,
  and `--output <cases.json>`.
- Write generated cases under `artifacts\<example>\generated_cases.json`, not
  inside `examples\`.
- Use `.json` for generated cases in this skill unless an existing package file
  explicitly shows another extension.
- Keep related risks in the packaged project config. For example, HTTP
  cross-user access and refund abuse both live in
  `examples\http-agent\promptbeat.yaml`; do not split them into invented files.
- Do not add a `--pack` flag. It is not part of the documented first-run
  command surface for these package examples.
- For Promptfoo YAML, use `eval` through `promptbeat-run-quick-eval`; do not use
  `validate` or `generate`.

## Dataset Subscription Notes

`subscriptions/safety-baseline.yaml` currently includes:

- `safety-baseline`
- `jailbreak-baseline`
- `overrefusal-baseline`
- `deception-baseline`
- `zh-safety-baseline`

Use `examples/dataset-subscriptions/safety-baseline/promptbeat.yaml` as the
working pattern for `seeds.subscriptions.file`, `include`, and per-subscription
`limit` overrides.

Raw public datasets are not included in full release packages. Ask the user to
set a local dataset directory such as:

```powershell
$env:PROMPTBEAT_DATASETS_DIR = "C:\tools\promptbeat-datasets\raw"
```

Do not present `uv run python scripts/download_datasets.py ...` as a package
command. It is a source-checkout helper only if the user has the source repo.

## First Commands

Normal LLM smoke:

```powershell
cd C:\tools\promptbeat

.\bin\promptbeat.cmd validate --config examples\llm-basic\promptbeat.yaml

.\bin\promptbeat.cmd generate `
  --config examples\llm-basic\promptbeat.yaml `
  --count 5 `
  --output artifacts\llm-basic\generated_cases.json
```

HTTP business agent:

```powershell
cd C:\tools\promptbeat

.\bin\promptbeat.cmd validate --config examples\http-agent\promptbeat.yaml

.\bin\promptbeat.cmd generate `
  --config examples\http-agent\promptbeat.yaml `
  --count 5 `
  --output artifacts\http-agent\generated_cases.json
```

Dataset subscription:

```powershell
cd C:\tools\promptbeat

$env:PROMPTBEAT_DATASETS_DIR = "C:\tools\promptbeat-datasets\raw"

.\bin\promptbeat.cmd validate --config examples\dataset-subscriptions\safety-baseline\promptbeat.yaml

.\bin\promptbeat.cmd generate `
  --config examples\dataset-subscriptions\safety-baseline\promptbeat.yaml `
  --count 5 `
  --output artifacts\dataset-subscriptions\safety-baseline\generated_cases.json
```

SCC / AI-WAF:

```powershell
cd C:\tools\promptbeat

.\bin\promptbeat.cmd config inspect --config examples\scc_waf\promptbeat.yaml

.\bin\promptbeat.cmd generate `
  --config examples\scc_waf\promptbeat.yaml `
  --count 5 `
  --output artifacts\scc_waf\generated_cases.json
```

Coding-agent project risk content:

```powershell
cd C:\tools\promptbeat

.\bin\promptbeat.cmd validate --config examples\codex_agent\promptbeat.yaml

.\bin\promptbeat.cmd generate `
  --config examples\codex_agent\promptbeat.yaml `
  --count 5 `
  --output artifacts\codex_agent\generated_cases.json
```

## Common Mistakes

- Do not use `.\bin\promptbeat.exe`; use the package wrapper
  `.\bin\promptbeat.cmd`.
- Do not omit the package-root `cd C:\tools\promptbeat` line.
- Do not claim `quick-smoke`, `privacy-pack`, or other pack names exist unless a
  file or command implementing them is present.
- Do not invent directories such as `risk-packs\`, `promptbeat-risk-packs\`, or
  `packs\`, or `cases\`.
- Do not add `--pack` to `generate`.
- Do not write generated output under `examples\` or switch to `.jsonl` without
  an existing package example.
- Do not use `promptbeat validate -c`; use
  `.\bin\promptbeat.cmd validate --config <promptbeat.yaml>`.
- Do not send a first-time user straight to benchmark dataset downloads when a
  local hand-written seed example fits.
- Do not treat dataset subscription YAML as raw dataset content.
- Do not mix coding-agent runtime setup with scenario selection; use
  `promptbeat-connect-coding-agent` for runtime wiring.
- Do not use source-checkout commands such as `go run` or dataset download
  scripts for a full-package user.
