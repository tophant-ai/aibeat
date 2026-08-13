# Promptbeat Skills

Promptbeat skills are small agent playbooks for answering product-specific setup,
evaluation, risk-selection, and debugging questions. Copy the skill directories into
your coding-agent runtime, then ask the agent for the Promptbeat task you want.

They are guidance for the coding agent, not additional CLI commands. After loading
them, keep talking to the agent in natural language: the agent selects the matching
skill, inspects the package paths, and proposes or runs the appropriate Promptbeat
commands under your normal approval and sandbox policy.

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

Copy each skill directory you want to enable. Keep the directory name, its
`SKILL.md`, and any `references/` directory together. The following commands load
all five public skills.

Claude Code:

```bash
mkdir -p ~/.claude/skills
for skill in promptbeat-skills/promptbeat-*; do
  [ -d "$skill" ] && cp -R "$skill" ~/.claude/skills/
done
```

Codex CLI:

```bash
mkdir -p ~/.codex/skills
for skill in promptbeat-skills/promptbeat-*; do
  [ -d "$skill" ] && cp -R "$skill" ~/.codex/skills/
done
```

OpenCode:

```bash
mkdir -p ~/.config/opencode/skills
for skill in promptbeat-skills/promptbeat-*; do
  [ -d "$skill" ] && cp -R "$skill" ~/.config/opencode/skills/
done
```

Windows PowerShell example for Codex CLI:

```powershell
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
Get-ChildItem .\promptbeat-skills -Directory -Filter 'promptbeat-*' |
  Copy-Item -Destination "$HOME\.codex\skills" -Recurse -Force
```

Replace `.codex\skills` with `.claude\skills` for Claude Code.

Use a project-local skill directory instead when your runtime documents one and
you want the Promptbeat guidance scoped to a single workspace.

## Use

Start a fresh agent session after copying or updating the directories. You do not
need special command syntax: describe the outcome and include the package path,
target type, or error when known. Explicitly name the skill if you want to force a
particular workflow.

| What you say | Skill the agent should use | What it should help produce |
| --- | --- | --- |
| “I unpacked Promptbeat in `/opt/promptbeat`. Help me run my first LLM safety check.” | `promptbeat-getting-started` | One suitable example, required environment variables, 1–3 first commands, and the report path. |
| “Connect this Codex workspace as the evaluation target and preserve trace evidence.” | `promptbeat-connect-coding-agent` | Runtime/provider wiring, workspace and sandbox checks, and the correct evaluation path. |
| “Validate this config, run five cases, and show me where the report is.” | `promptbeat-run-quick-eval` | The correct `validate`, `generate`, `run`, `eval`, or `report` commands without mixing config types. |
| “Choose a small authorization and prompt-injection smoke scope before we spend many tokens.” | `promptbeat-select-risk-pack` | An existing example or subscription, a five-case preview, and a justified next step. |
| “This run says `working_dir does not exist`; diagnose it without changing credentials.” | `promptbeat-debug-run` | Boundary-first diagnosis and the smallest safe fix. |

An end-to-end first conversation can be as short as:

```text
User: I unpacked Promptbeat at /opt/promptbeat. Help me test a normal LLM.
Agent: This is the normal-LLM path. I’ll use the packaged llm-basic example.
       First, confirm the provider environment variables, then validate and run it.
User: Start with five generated cases so I can review them before calling the target.
Agent: I’ll use promptbeat-select-risk-pack and write the preview under artifacts/.
User: The preview looks right. Run the evaluation and tell me where report.html is.
Agent: I’ll use promptbeat-run-quick-eval, run the project config, and report the artifact paths.
```

The agent may execute commands only when its runtime and your approval policy allow
it. Otherwise it should give copyable commands and explain what each one will create.

## Verify

Ask a Promptbeat-specific question in a fresh session:

```text
I downloaded Promptbeat. Help me run the examples/bootstrap evaluation and find the report.
```

Expected behavior: the agent should trigger `promptbeat-getting-started` or
`promptbeat-run-quick-eval`, tell you to run commands from the release package
root, use `examples/bootstrap/promptbeat.yaml`, and point the result to an
`artifacts/` report path. If it suggests source-only commands or invented paths,
reload the skill directory and ask again with the package root path included.

Also verify that the installed directory still contains its references:

```bash
find ~/.codex/skills/promptbeat-getting-started -maxdepth 2 -type f
```

If a skill is not selected, mention its exact name in the request, for example:

```text
Use promptbeat-debug-run to diagnose this error: <paste the error, with secrets removed>.
```

To update the skills, copy the directories from a newer release over the existing
ones and start a new session. To disable one, remove only that skill directory from
the runtime's skills folder.
