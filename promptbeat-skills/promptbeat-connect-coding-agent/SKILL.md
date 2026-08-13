---
name: promptbeat-connect-coding-agent
description: Use when connecting Codex, Claude Code, OpenCode, OpenClaw, coding-agent CLIs, agent gateways, workspaces, sandbox policies, provider files, or trace capture to Promptbeat as an evaluation target.
---

# Promptbeat Connect Coding Agent

## Overview

Treat coding agents as runtime targets with workspace, sandbox, approval, and
trace boundaries. Do not treat them as ordinary chat models.

Assume the user downloaded and extracted the full Promptbeat package and is
running commands from the package root. On Windows, show package commands with
`.\bin\promptbeat.cmd` first. Mention `./bin/promptbeat` only as the Unix
equivalent when useful.

## Choose the Runtime Path

| Runtime | Starting point | Status |
| --- | --- | --- |
| Codex SDK / Codex CLI | `examples/codex_agent/` | Runnable example. |
| Claude Code | `examples/agent-adapters/claude-code/` | Template requiring real runtime wiring. |
| OpenCode | `examples/agent-adapters/opencode/` | Template requiring SDK/server wiring. |
| OpenClaw | `examples/agent-adapters/openclaw/` | Template requiring gateway URL, key, and agent id. |

Route users in this order:

1. Use the Codex example first when the user can run Codex. It is the runnable
   path for validating coding-agent safety quickly.
2. Use Claude Code, OpenCode, and OpenClaw provider files as templates only.
   Before eval, require a real runtime wrapper, SDK, or server; credentials;
   an intended workspace; sandbox and approval policy; and trace capture.

## Required Checks

Before running an evaluation, confirm:

- The command is run from the full package root, or paths are absolute.
- `working_dir` points at the intended agent workspace.
- Sandbox and approval policy match the risk being tested.
- Credentials are provided through environment variables, not committed YAML.
- The adapter returns final answer plus trace evidence when available.

Before using `promptbeat eval --provider-file`, explain that `--config` must
point to a generated or existing promptfoo YAML. It is not a Promptbeat project
YAML, and it is not the cases JSON produced by `promptbeat generate`.

Valid ways to obtain that promptfoo YAML:

- Use the promptfoo artifact written by `promptbeat run`.
- Use the project backend output configured in
  `examples\codex_agent\promptbeat.yaml`, normally
  `artifacts\promptfoo.redteam.yaml`.
- Run
  `.\bin\promptbeat.cmd compile promptfoo --config examples\codex_agent\promptbeat.yaml --output <generated-promptfoo.yaml>`.

## Load Detailed Recipes

- For Codex, Claude Code, OpenCode, and OpenClaw command recipes, read
  `references/agent-runtimes.md`.
- For the common validate/generate/run flow, use `promptbeat-run-quick-eval`.

## Common Mistakes

- Do not present Claude Code, OpenCode, or OpenClaw templates as already verified.
- Do not skip trace capture for coding-agent safety cases; final answer alone may
  miss unsafe commands, file reads, diffs, or policy denials.
- Do not tell full-package users to use source-checkout commands as the normal
  path.
- Do not use host CLI binaries for formal benchmark-style Target Lab runs when
  the harness expects sandbox-local binaries.
