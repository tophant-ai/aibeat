<div align="center">
  <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat" width="96" />

  <h1>AI Beat</h1>

  <p><strong>From prompt red teaming to agent behavior evidence.</strong></p>
  <p>Scenario-driven safety evaluation for LLMs, RAG apps, and real agent runtimes.</p>

  <p>
    <a href="README.zh-CN.md">中文</a>
    ·
    <a href="https://github.com/tophant-ai/aibeat/releases">Releases</a>
    ·
    <a href="examples/">Examples</a>
    ·
    <a href="https://promptbeat.mintlify.app">Docs</a>
  </p>

  <p>
    <a href="https://github.com/tophant-ai/aibeat/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/tophant-ai/aibeat?style=flat&logo=github" /></a>
    <a href="https://github.com/tophant-ai/aibeat/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/tophant-ai/aibeat?style=flat&color=2dd288" /></a>
    <img alt="LLM + Agent" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" />
  </p>
</div>

<br />

<p align="center">
  <img src="demo/recordings/videos/hero.gif" alt="PromptBeat evaluation TUI" width="900" />
</p>

## What it does

AI Beat turns AI safety testing into a repeatable engineering loop:

```text
scenario + seeds + attack strategy
  → real target execution
  → judge + evidence
  → promote / rewrite / reject
  → regression baseline
```

| Product | Role |
| --- | --- |
| **PromptBeat** | Find risk — generate, run, score, and grow attack cases |
| **AgentBeat** | Prove the step — capture tools, files, env changes, and traces |

Use PromptBeat for coverage and reusable test sets.  
Use AgentBeat when “the reply looks safe” is not enough and you need the failing step.

> For pre-release checks, continuous regression, and evidence-grade findings.  
> Not a runtime WAF / gateway.

## Highlights

- **Scenario-driven** — risk objectives, success criteria, and judges — not isolated prompts
- **Real targets** — LLM APIs, HTTP agents, coding agents, adapters
- **Evidence-first** — answers, tool calls, file/env diffs, and case-level drill-down
- **Living datasets** — promote hard hits, rewrite near-misses, reject noise
- **Comparable runs** — same attack set and judge across models/providers

<p align="center">
  <img src="docs/assets/screenshots/readme-report-promptbeat.png" alt="Evaluation report overview" width="900" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-detail-agentbeat.png" alt="Case detail with judge and agent trace" width="900" />
</p>

## Quick start

```bash
# 1) Download a release and unpack, then:
./bin/promptbeat --version

# 2) Configure providers for the basic example
export ATTACKER_MODEL_NAME="openai:gpt-4o"
export ATTACKER_BASE_URL="https://api.openai.com/v1"
export ATTACKER_API_KEY="sk-..."

export JUDGE_MODEL_NAME="openai:gpt-4o"
export JUDGE_BASE_URL="https://api.openai.com/v1"
export JUDGE_API_KEY="sk-..."

export TARGET_MODEL_NAME="openai:gpt-4o-mini"
export TARGET_BASE_URL="https://api.openai.com/v1"
export TARGET_API_KEY="sk-..."

# 3) Validate → generate → eval → report
./bin/promptbeat validate --config examples/llm-basic/promptbeat.yaml
./bin/promptbeat generate --config examples/llm-basic/promptbeat.yaml --output artifacts/llm-basic/cases.json
./bin/promptbeat eval --config artifacts/llm-basic/promptfoo.redteam.yaml --output-dir artifacts/llm-basic/eval
./bin/promptbeat report --input artifacts/llm-basic/eval/evaluation_result.json --output artifacts/llm-basic/report.html
```

## Examples

| Path | Start here if… |
| --- | --- |
| `examples/llm-basic/` | Single-model safety eval |
| `examples/multi-llm/` | Side-by-side model comparison |
| `examples/http-agent/` | Business agent over HTTP |
| `examples/codex_agent/` | Coding agent / runtime traces |
| `examples/dataset-subscriptions/safety-baseline/` | Dataset-subscription workflow |
| `examples/china-compliance/` | Compliance-oriented scenarios |

## Targets

LLM providers · HTTP agents · Codex / coding-agent runtimes · Claude Code / OpenCode / OpenClaw via adapters · Target Lab / Inspect-style environments

Adapters should return the final answer and, when available, **trace evidence** (commands, tools, files, network, policy denials).

## Skills

Natural-language helpers under `promptbeat-skills/`:

`getting-started` · `select-risk-pack` · `run-quick-eval` · `connect-coding-agent` · `debug-run`

## Learn more

- [Docs](https://promptbeat.mintlify.app)
- [Usage guide](docs/usage-guide.md)
- [Releases](https://github.com/tophant-ai/aibeat/releases)
- [Examples](examples/)

---

<div align="center">
  <sub>PromptBeat finds risk · AgentBeat proves the step · Continuous retest keeps every AI update honest</sub>
</div>
