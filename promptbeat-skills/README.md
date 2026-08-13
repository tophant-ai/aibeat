# Promptbeat Skills

Promptbeat skills are small agent playbooks for answering product-specific setup,
evaluation, risk-selection, and debugging questions. Copy the skill directories into
your coding-agent runtime, then ask the agent for the Promptbeat task you want.

## Download

You can get these skills in either of two ways:

1. Download a Promptbeat release package from <https://github.com/tophant-ai/aibeat/releases>
   and use the bundled `promptbeat-skills/` directory when present.
2. Use the `promptbeat-skills/` directory from this repository checkout.

The public skill set contains:

| Skill | Use it when |
| --- | --- |
| `promptbeat-getting-started` | You need the first package-root path for an LLM, HTTP agent, or coding-agent evaluation. |
| `promptbeat-connect-coding-agent` | You need Codex, Claude Code, OpenCode, or OpenClaw runtime wiring guidance. |
| `promptbeat-run-quick-eval` | You have a Promptbeat or generated Promptfoo config and want the right validate, run, eval, or report command. |
| `promptbeat-select-risk-pack` | You need to choose scenarios, seeds, dataset subscriptions, or a small smoke scope. |
| `promptbeat-debug-run` | A Promptbeat command, provider file, environment variable, runtime, or report step failed. |

## Load

Copy each skill directory you want to enable. Keep the directory name and its
`SKILL.md`; copy any `references/` directory beside it.

Claude Code:

```bash
mkdir -p ~/.claude/skills
cp -R promptbeat-skills/promptbeat-getting-started ~/.claude/skills/
cp -R promptbeat-skills/promptbeat-run-quick-eval ~/.claude/skills/
```

Codex CLI:

```bash
mkdir -p ~/.codex/skills
cp -R promptbeat-skills/promptbeat-getting-started ~/.codex/skills/
cp -R promptbeat-skills/promptbeat-run-quick-eval ~/.codex/skills/
```

OpenCode:

```bash
mkdir -p ~/.config/opencode/skills
cp -R promptbeat-skills/promptbeat-getting-started ~/.config/opencode/skills/
cp -R promptbeat-skills/promptbeat-run-quick-eval ~/.config/opencode/skills/
```

Use a project-local skill directory instead when your runtime documents one and
you want the Promptbeat guidance scoped to a single workspace.

## Use and Verify

Start a fresh agent session after copying the files, then ask a Promptbeat-specific
question:

```text
I downloaded Promptbeat. Help me run the examples/bootstrap evaluation and find the report.
```

Expected behavior: the agent should trigger `promptbeat-getting-started` or
`promptbeat-run-quick-eval`, tell you to run commands from the release package
root, use `examples/bootstrap/promptbeat.yaml`, and point the result to an
`artifacts/` report path. If it suggests source-only commands or invented paths,
reload the skill directory and ask again with the package root path included.
