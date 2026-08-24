---
name: promptbeat-getting-started
description: Use when a user wants to start using a downloaded Promptbeat full package, connect an HTTP agent, LLM, coding agent, choose an evaluation path, run a first red-team test, or asks where to begin.
---

# Promptbeat Getting Started

## Overview

Be the first-mile router for a downloaded Promptbeat full package. Get the user
from a vague goal to one package example, one command path, and one next skill.

Default assumption: the user has unpacked a full release package and should run
commands from that package root. Do not lead with source-checkout, `core/go`, or
`go run` instructions.

## Package-Root Check

If the user has not shown a package path, ask where the package was unpacked.
If commands fail with "not found" or path errors, first check that the user is in
the package root:

```powershell
cd C:\path\to\promptbeat
Test-Path .\bin\promptbeat.cmd
Test-Path .\examples
Test-Path .\subscriptions
```

For Linux/macOS, use `./bin/promptbeat` instead of `.\bin\promptbeat.cmd`.

## One-Question Router

If the target type is unclear, ask exactly one question:

```text
Are you testing an HTTP API/business agent, a normal LLM, or a coding agent?
```

Then stop and wait for the answer. Do not recommend a default example, command,
credential setup, or risk pack until the user picks a target class. Do not
explain the full target/scenario/seed/provider model before routing.

## Route Table

| User intent | Route | First package path |
| --- | --- | --- |
| HTTP service, API, business agent | HTTP agent example | `examples\http-agent\promptbeat.yaml` |
| Normal LLM safety baseline | LLM example | `examples\llm-basic\promptbeat.yaml` |
| Codex, Claude Code, OpenCode, OpenClaw | `promptbeat-connect-coding-agent` | `examples\codex_agent\promptbeat.yaml` |
| Already has `promptbeat.yaml` | `promptbeat-run-quick-eval` | User's config path |
| Needs risks, seeds, subscriptions | `promptbeat-select-risk-pack` | `examples\llm-basic\` or `examples\dataset-subscriptions\safety-baseline\` |
| Validate/generate/run/eval/report error | `promptbeat-debug-run` | Error-specific |

## First Response Shape

Use this shape for new users:

1. Classification: "This is an HTTP agent / LLM / coding-agent path."
2. Package root: tell them to `cd` into the unpacked full package.
3. Next commands: give only 1-3 commands.
4. Result location: name the artifact or report path.
5. Next skill: route deeper only after the first path is clear.

## Starter Commands

### HTTP Agent

Use when the target already exposes an evaluation HTTP endpoint.

```powershell
cd C:\path\to\promptbeat
$env:AGENT_EVAL_TOKEN="replace-me"
.\bin\promptbeat.cmd validate --config examples\http-agent\promptbeat.yaml
.\bin\promptbeat.cmd run --config examples\http-agent\promptbeat.yaml --output-dir examples\http-agent\artifacts\run
```

The endpoint should accept a generated prompt and return JSON with an `answer`
field. Optional trace data is useful for debugging and safety evidence.

### Normal LLM

Use this when the user wants a plain model safety smoke test before connecting an
agent.

```powershell
cd C:\path\to\promptbeat
.\bin\promptbeat.cmd validate --config examples\llm-basic\promptbeat.yaml
.\bin\promptbeat.cmd run --config examples\llm-basic\promptbeat.yaml --output-dir examples\llm-basic\artifacts\run
```

If env vars are missing, send the user to `examples\llm-basic\README.md`.

### Coding Agent

Do not hand-write adapter YAML in the first answer. Route to
`promptbeat-connect-coding-agent` and start with the package example:

```powershell
cd C:\path\to\promptbeat
.\bin\promptbeat.cmd validate --config examples\codex_agent\promptbeat.yaml
```

Codex has a runnable package path. Claude Code, OpenCode, and OpenClaw adapter
files under `examples\agent-adapters\` are templates until real runtime wiring
and trace capture are configured.

## Common Mistakes

- Do not send new users to source-checkout commands such as `go run` or
  `core/go`.
- Do not use a bare `promptbeat.exe` for full packages; use the wrapper in
  `bin\promptbeat.cmd` or `./bin/promptbeat`.
- Do not invent commands such as `promptbeat init target` or
  `promptbeat run --quick`.
- Do not pass a Promptbeat project YAML to `promptbeat eval`; use
  `promptbeat-run-quick-eval` for command selection.
- Do not present adapter templates as verified runtimes before a real run
  produces artifacts.
