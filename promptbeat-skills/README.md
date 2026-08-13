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

## Complete Walkthrough: From Package to Report

This walkthrough uses the packaged `examples/bootstrap/` project. It shows both
what to ask and what a good agent response should contain. Agent wording can vary;
verify the paths, commands, cost boundary, and artifacts instead of exact prose.

### 1. Route the Request

Ask:

```text
Promptbeat is unpacked at /opt/promptbeat. Use promptbeat-getting-started to help
me test a normal LLM. Inspect first and do not make paid model calls yet.
```

A good response looks like:

```text
This is the normal-LLM path. I’ll work from /opt/promptbeat and use
examples/bootstrap/promptbeat.yaml for the shortest complete walkthrough.
I’ll first check the package layout and provider environment variables, then run
validate. Validation checks configuration and wiring without making model calls.
```

The agent should not switch to a source checkout, invent a config, or ask you to
paste API keys into chat.

### 2. Configure Providers Safely

Ask:

```text
Show me which provider environment variables this example needs. Use placeholders;
do not print, store, or commit my real API keys.
```

A good response should give an environment-variable template similar to:

```bash
export ATTACKER_MODEL_NAME="openai:gpt-4o"
export ATTACKER_BASE_URL="https://api.openai.com/v1"
export ATTACKER_API_KEY="<set-locally>"

export JUDGE_MODEL_NAME="openai:gpt-4o"
export JUDGE_BASE_URL="$ATTACKER_BASE_URL"
export JUDGE_API_KEY="$ATTACKER_API_KEY"

export TARGET_MODEL_NAME="openai:gpt-4o-mini"
export TARGET_BASE_URL="$ATTACKER_BASE_URL"
export TARGET_API_KEY="$ATTACKER_API_KEY"
```

The exact model names and endpoint may differ for your OpenAI-compatible provider.
The response should keep secrets in environment variables and explain the attacker,
judge, and target roles.

### 3. Validate Before Spending Tokens

Ask:

```text
Validate the bootstrap project. If you cannot execute commands, give me the exact
command and explain the expected result.
```

A good response should run or provide:

```bash
cd /opt/promptbeat
./bin/promptbeat validate --config examples/bootstrap/promptbeat.yaml
```

It should say whether validation passed and identify any missing path or environment
variable. It should not claim that validation exercised the target model.

### 4. Preview a Small Risk Scope

Ask:

```text
Use promptbeat-select-risk-pack. Keep the packaged bootstrap scenarios, generate
only five cases under artifacts/bootstrap-preview, and do not call the target yet.
Before executing, tell me whether this step can call an attacker model.
```

A good response looks like:

```text
I’ll reuse the packaged scenarios rather than inventing a risk pack. Generation
does not call the target, but it may call the configured attacker model and incur
provider cost. I’ll write five reviewable cases under artifacts/.
```

It should then run or provide a command shaped like:

```bash
./bin/promptbeat generate \
  --config examples/bootstrap/promptbeat.yaml \
  --count 5 \
  --output artifacts/bootstrap-preview/generated_cases.json
```

Review `generated_cases.json` before authorizing execution against the target.

### 5. Run the Evaluation

Ask:

```text
The five cases are approved. Use promptbeat-run-quick-eval to run the bootstrap
pipeline with TUI progress. Keep all outputs under artifacts/bootstrap and report
the final paths without exposing credentials.
```

A good response should run or provide:

```bash
./bin/promptbeat pipeline run \
  --config examples/bootstrap/promptbeat.yaml \
  --output-dir artifacts/bootstrap \
  --progress tui
```

After completion, it should report real paths that exist, especially:

```text
artifacts/bootstrap/report.html
```

It should also summarize how many cases ran, which provider roles were used, and
whether anything failed. It must not claim success before checking the exit status
and artifacts.

### 6. Diagnose a Failure Without Losing Context

If a step fails, ask:

```text
Use promptbeat-debug-run to diagnose the error below. First classify the failing
boundary as config, path, provider, Promptfoo, target runtime, result parsing, or
report rendering. Preserve the current artifacts and do not rotate credentials
unless the evidence points to authentication.

<paste the redacted error>
```

A good response should identify the boundary, cite the command or artifact that
supports the diagnosis, and propose the smallest reversible fix. Continue the same
conversation after the fix so the agent retains the selected target, risk scope,
and artifact directory.

### Completion Checklist

A successful guided run ends with all of the following:

- The agent used package-root commands, not source-only commands.
- Provider secrets stayed in environment variables.
- Validation completed before model execution.
- You reviewed a small generated sample and understood its cost boundary.
- The target was called only after approval.
- The agent checked the exit status and reported existing artifact paths.
- `artifacts/bootstrap/report.html` opens as the final human-readable report.

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
