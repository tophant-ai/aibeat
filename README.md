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
    <a href="aibeat-site/index.mdx"><b>Site docs</b></a> ·
    <a href="docs/README.md"><b>Docs index</b></a> ·
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

Download a package for your platform from the versioned release pages:

| Product | Release | Package contents |
| --- | --- | --- |
| PromptBeat | [v0.4.1](https://github.com/tophant-ai/aibeat/releases/tag/v0.4.1) | CLI, examples, Node.js 22.22.2 and promptfoo 0.121.9 |
| AgentBeat | [v0.4.0](https://github.com/tophant-ai/aibeat/releases/tag/v0.4.0) | Standalone CLI, examples and SDKs; no Node.js or promptfoo required |

Choose `.tar.gz` for Linux x64, macOS arm64 or macOS x64, or `.zip` for
Windows x64. Each release publishes archive checksums in `SHA256SUMS.txt`,
not individual `.sha256` files.

For example, download, verify and unpack PromptBeat on Linux x64:

```bash
curl -fLO https://github.com/tophant-ai/aibeat/releases/download/v0.4.1/promptbeat-0.4.1-linux-x64.tar.gz &&
curl -fLO https://github.com/tophant-ai/aibeat/releases/download/v0.4.1/SHA256SUMS.txt &&
grep 'promptbeat-0.4.1-linux-x64.tar.gz$' SHA256SUMS.txt | sha256sum -c - &&
tar -xzf promptbeat-0.4.1-linux-x64.tar.gz &&
export PATH="$PWD/promptbeat-0.4.1-linux-x64/bin:$PATH" &&
promptbeat --version
```

Stop if checksum verification fails. Keep the package directory intact: the
PromptBeat launcher uses its bundled runtime. The `PATH` setting above lasts
for the current shell. For other platforms and bundled-example walkthroughs,
see the [PromptBeat quickstart](aibeat-site/promptbeat/quickstart.mdx) and the
README inside each downloaded package.

The repository's `install.sh` and `install.ps1` expect the raw-binary and
adjacent `.sha256` asset layout used by the older `v0.3-agentbeat-preview`
releases. They do not install the v0.4.x packages and are not included in those
packages. Use the archives above instead.

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

`agentbeat` evaluates a registered Agent target over a language-neutral HTTP
contract and scores the collected evidence in the same binary. No PromptBeat
executable, Node.js, or Promptfoo runtime is needed.

| Command | What it does |
| --- | --- |
| `agentbeat preflight` | Validates the Case/Target contract and observation tier without calling the target |
| `agentbeat eval-run` | Invokes the target once, collects evidence, runs the Judge, writes one result |
| `agentbeat score` | Scores evidence you already have, without rerunning the target |

Try the contract first, without model credentials or an external agent. From
the extracted `agentbeat` release package, start the local stub Target and
Judge in one terminal:

```bash
python3 examples/local-probe/serve.py
```

Then in a second terminal:

```bash
export AIBEAT_AGENT_TARGET_REGISTRY="$PWD/examples/local-probe/agent-target-registry.json"
export AGENTBEAT_TARGET_URL="http://127.0.0.1:39103"
export AIBEAT_JUDGE_BASE_URL="http://127.0.0.1:39104/v1"
export AIBEAT_JUDGE_MODEL="local-contract-probe"

./bin/agentbeat eval-run < examples/local-probe/eval-run.json > result.json
```

`result.json` should report `eval-run-response-v1` with one target call and
one judge call. Both stubs are fixed responses, so the score is synthetic and
proves only the wiring. `examples/local-probe/README.md` in the package covers
Windows and the fields to check.

To evaluate your own agent, implement the target HTTP contract (the package's
`examples/sdk-target/` has Python and Node.js targets), register it in the
target registry, and point the Judge variables at a real model. See the
[typed SDK](sdk/agentbeat-sdk-js/README.md) for the contract. The older
`agentbeat run --adapter` path is kept only for existing JavaScript adapters
exporting `createEvalServer()`.

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

See [PromptBeat Skills](aibeat-site/promptbeat/skills.mdx).

## Repository scope

This public repository distributes product documentation, runnable examples,
Skills, the AgentBeat JS SDK, and the Mintlify site sources under
[`aibeat-site/`](aibeat-site/). Full product implementation (`core/`, `api/`),
internal evaluation datasets, and deployment pipelines stay in the private
maintenance repository. Public [Releases](https://github.com/tophant-ai/aibeat/releases)
provide checksummed installers without requiring a source checkout.

Keep credentials in environment variables, review generated cases before
running costly evaluations, and use a restricted workspace for agent targets.

## Documentation

Prefer the docs tree over packing long guides into this README:

[Docs index](docs/README.md) ·
[AgentBeat overview](docs/agentbeat/overview.md) ·
[PromptBeat overview](docs/promptbeat/overview.md) ·
[Site home](aibeat-site/index.mdx) ·
[Releases](https://github.com/tophant-ai/aibeat/releases) ·
[Discord](https://discord.gg/NXXz8JG74)
