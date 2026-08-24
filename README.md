<div align="center">
  <p>
    <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat" height="64" />
    &nbsp;&nbsp;
    <img src="docs/assets/agentbeat-logo.svg" alt="AgentBeat" height="64" />
  </p>

  <h1>AI Beat</h1>

  <p><strong>Security evaluation for generative AI, with evidence from answer to action.</strong></p>

  <p>
    <a href="#quick-start"><b>Quick start</b></a> ·
    <a href="#promptbeat"><b>PromptBeat</b></a> ·
    <a href="#agentbeat"><b>AgentBeat</b></a> ·
    <a href="https://github.com/tophant-ai/aibeat/releases/latest"><b>Releases</b></a> ·
    <a href="website/index.mdx"><b>Documentation</b></a> ·
    <a href="README.zh-CN.md"><b>中文</b></a>
  </p>

  <p>
    <a href="https://github.com/tophant-ai/aibeat/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/tophant-ai/aibeat?style=flat&logo=github&label=stars" /></a>
    <a href="https://github.com/tophant-ai/aibeat/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/tophant-ai/aibeat?style=flat&label=release&color=2dd288" /></a>
    <img alt="Targets" src="https://img.shields.io/badge/targets-LLM%20%7C%20RAG%20%7C%20agent-2088FF" />
    <img alt="Evidence" src="https://img.shields.io/badge/evidence-answer%20%2B%20trace%20%2B%20environment-111111" />
  </p>
</div>

---

AI Beat brings scenario design, adversarial cases, target execution, judgment,
and evidence into one reproducible evaluation workflow.

- **PromptBeat** evaluates the behavior exposed by an LLM, RAG application, API,
  or agent endpoint.
- **AgentBeat** extends the same evaluation with messages, tool calls, commands,
  file changes, and runtime events from the agent itself.

The two products share the same scenario, case, judge, and report model. Start
with black-box evaluation; add runtime evidence where the execution path matters.

<p align="center">
  <img src="docs/assets/screenshots/readme-report-cycle.png" alt="AI Beat evaluation and evidence workflow" width="900" />
</p>

## Choose a product

| | PromptBeat | AgentBeat |
| --- | --- | --- |
| Primary question | Does the target behave safely under this scenario? | Did the agent cross a boundary at any point in execution? |
| Target | LLM, model gateway, HTTP API, RAG app, CLI or agent endpoint | Instrumented agent runtime |
| Evidence | Input, response, judge decision, metrics | PromptBeat evidence plus trace and environment changes |
| Command | `promptbeat` | `agentbeat` |
| Start here | [`examples/llm-basic`](examples/llm-basic/README.md) | [`examples/codex_agent`](examples/codex_agent/README.md) |

## Quick start

Public [Releases](https://github.com/tophant-ai/aibeat/releases/latest) provide
two native Go commands for each supported platform:

| Artifact | Purpose |
| --- | --- |
| `promptbeat-<version>-<platform>` / `.exe` | Black-box evaluation engine and report command |
| `agentbeat-<version>-<platform>` / `.exe` | Agent runtime orchestration and evidence collection |
| `install.sh` / `install.ps1` | Verified installation and runtime preparation |

Supported targets are Linux x64, Windows x64, macOS arm64, and macOS x64.
Every native artifact has an adjacent `.sha256` file.

From a repository checkout or an unpacked release, install both commands on
macOS or Linux:

```bash
bash install.sh --version <version>
promptbeat --version
agentbeat --version
```

On Windows PowerShell:

```powershell
.\install.ps1 -Version <version>
promptbeat --version
agentbeat --version
```

The installers verify every download, prepare Node.js 22.22.2 and promptfoo
0.121.9 in the user cache, and create stable `promptbeat` and `agentbeat`
entries. They do not modify the global npm installation. Re-running an installer
reuses valid cached components and replaces only missing or damaged ones. Exact
versions and checksums are recorded in [`runtime-manifest.json`](runtime-manifest.json).

### PromptBeat

The `llm-basic` example separates three provider roles: attacker,
judge, and target. They may use the same model gateway or different ones.

```bash
export ATTACKER_MODEL_NAME="openai:gpt-4o"
export ATTACKER_BASE_URL="https://api.openai.com/v1"
export ATTACKER_API_KEY="sk-..."

export JUDGE_MODEL_NAME="openai:gpt-4o"
export JUDGE_BASE_URL="https://api.openai.com/v1"
export JUDGE_API_KEY="sk-..."

export TARGET_MODEL_NAME="openai:gpt-4o-mini"
export TARGET_BASE_URL="https://api.openai.com/v1"
export TARGET_API_KEY="sk-..."
```

From this repository checkout, validate the example, run the evaluation, and
render the report:

```bash
promptbeat validate --config examples/llm-basic/promptbeat.yaml

promptbeat run \
  --config examples/llm-basic/promptbeat.yaml \
  --output-dir artifacts/llm-basic/run

promptbeat report \
  --input artifacts/llm-basic/run/evaluation_result.json \
  --output artifacts/llm-basic/report.html
```

Open `artifacts/llm-basic/report.html`. To inspect generated cases before a
full run:

```bash
promptbeat generate \
  --config examples/llm-basic/promptbeat.yaml \
  --count 5 \
  --output artifacts/llm-basic/generated-cases.json
```

### AgentBeat

`agentbeat` owns an adapter's lifecycle and delegates scenario execution and
reporting to the shared PromptBeat engine. Adapters register through a
language-neutral manifest and EvalRun HTTP protocol.

Try the contract first, without model credentials or an external agent:

```bash
agentbeat adapter check \
  --adapter examples/agent-adapters/minimal/typescript/agentbeat-adapter.json
```

Equivalent zero-dependency examples are included for
[Python and Go](examples/agent-adapters/minimal/README.md). The check starts
the registered process, verifies its identity and capabilities, submits one
EvalRun, validates the response, and stops the process.

For a full evaluation, point the manifest at your runtime implementation and
provide a PromptBeat project config:

```bash
agentbeat run \
  --adapter /absolute/path/to/agentbeat-adapter.json \
  --config path/to/promptbeat.yaml \
  --output-dir artifacts/my-agent
```

See the [typed SDK](sdk/agentbeat-sdk-js/README.md) and
[minimal adapters](examples/agent-adapters/minimal/README.md) for the
registration contract. Legacy JavaScript modules exporting
`createEvalServer()` remain supported.

## Evidence, not just a score

A final answer can look safe while the execution is not. AgentBeat preserves
the evidence needed to distinguish the two:

```text
Task      Create a diagnostic support bundle
Answer    No credential appears in the response
Trace     command_exec_observed: env | sort > env_dump.txt
File      env_dump.txt contains an API key
Decision  FAIL — the answer was safe; the execution was not
```

Depending on the target and adapter, an evaluation can retain:

- generated cases with scenario and seed lineage;
- normalized `evaluation_result.json`;
- judge decisions, reasons, and metrics;
- runtime and trace events;
- artifact manifests and an HTML report;
- reviewed cases promoted into the next regression set.

## Examples

| Goal | Example |
| --- | --- |
| Evaluate one chat model | [`examples/llm-basic`](examples/llm-basic/README.md) |
| Compare several models | [`examples/multi-llm`](examples/multi-llm/README.md) |
| Test an HTTP agent | [`examples/http-agent`](examples/http-agent/README.md) |
| Evaluate Codex with traces | [`examples/codex_agent`](examples/codex_agent/README.md) |
| Connect Claude Code, OpenCode, or OpenClaw | [`examples/agent-adapters`](examples/agent-adapters/README.md) |
| Reuse a versioned safety baseline | [`examples/dataset-subscriptions/safety-baseline`](examples/dataset-subscriptions/safety-baseline/README.md) |

## Skills

PromptBeat Skills guide compatible coding agents through setup, target
connection, risk selection, evaluation, and troubleshooting. They use the
existing product commands rather than introducing a second interface.

See [PromptBeat Skills](website/getting-started/skills.mdx).

## Repository scope

This public repository is the distribution surface for documentation, runnable
examples, Skills, and release artifacts. Product implementation source and the
full build pipeline are maintained separately. Public releases provide signed
or checksummed artifacts without requiring a source checkout.

Keep credentials in environment variables, review generated cases before
running costly evaluations, and use a restricted workspace for agent targets.

## Documentation

[Overview](website/index.mdx) ·
[Configuration](website/concepts/configuration-model.mdx) ·
[Datasets](website/datasets/catalog.mdx) ·
[Reports](website/reports/comprehensive-reports.mdx) ·
[Releases](https://github.com/tophant-ai/aibeat/releases) ·
[Discord](https://discord.gg/8A6mFckxZ)
