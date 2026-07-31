<div align="center">
  <p>
    <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat logo" height="72" />
    &nbsp;&nbsp;
    <img src="docs/assets/agentbeat-logo.svg" alt="AgentBeat logo" height="72" />
  </p>

  <h1>AI Beat · PromptBeat &amp; AgentBeat</h1>

  <p><strong>From prompt red teaming to agent behavior evidence.</strong></p>
  <p>Scenario-driven safety evaluation for LLMs, RAG apps, and real agent runtimes.</p>
  <p><a href="README.zh-CN.md"><strong>中文介绍</strong></a></p>

  <p>
    <a href="https://github.com/tophant-ai/promptbeat/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/tophant-ai/promptbeat?style=flat&logo=github&label=Stars" /></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-2dd288" />
    <img alt="AI Red Teaming" src="https://img.shields.io/badge/AI-Red%20Teaming-7c3aed" />
    <img alt="LLM + Agent" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" />
    <img alt="Evidence-first" src="https://img.shields.io/badge/evidence-answer%20%2B%20trace-111111" />
  </p>

  <p>
    <a href="#why-aibeat"><strong>Why AI Beat</strong></a>
    · <a href="#promptbeat--agentbeat"><strong>Products</strong></a>
    · <a href="#quick-start"><strong>Quick Start</strong></a>
    · <a href="https://github.com/tophant-ai/promptbeat/releases"><strong>Releases</strong></a>
    · <a href="examples/"><strong>Examples</strong></a>
    · <a href="website/"><strong>Docs</strong></a>
  </p>

  <br />
  <img src="demo/recordings/videos/hero.gif" alt="PromptBeat live red-team evaluation TUI" width="960" />
</div>

---

Stop treating AI safety as a one-off red-team project.

**PromptBeat** continuously finds and upgrades attack cases.  
**AgentBeat** verifies whether a real agent actually crossed the line — with tools, files, and environment evidence, not just the final chat reply.

```text
PromptBeat: discover risk
    → AgentBeat: verify real behavior
    → findings + regression data feed the next round
```

> AI Beat is for **pre-release acceptance, continuous regression, and evidence-grade findings**.  
> It does **not** replace a runtime WAF / gateway.

## Evidence-grade reports

Reports keep more than a score: overview metrics, model comparison, case-level drill-down, and runtime traces for retest.

### Overview

<p align="center">
  <img src="docs/assets/screenshots/readme-report-promptbeat.png" alt="PromptBeat evaluation report overview with PASS/FAIL counts and model performance" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-report-agentbeat.png" alt="AgentBeat runtime evaluation report for a coding-agent target" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-report-cycle.png" alt="PromptBeat dataset build-cycle report with stable, rewrite, and reject outcomes" width="960" />
</p>

### Case Explorer & evidence detail

Drill from the global result into every execution: status, risk, target/model, then open the case sheet for expected vs actual, judge rationale, and agent trace.

<p align="center">
  <img src="docs/assets/screenshots/readme-case-explorer-promptbeat.png" alt="PromptBeat Case Explorer filtered to FAIL cases" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-explorer-agentbeat.png" alt="AgentBeat Case Explorer listing coding-agent cases" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-detail-agentbeat.png" alt="AgentBeat case detail with Expected vs Actual, judge decision, and Agent Trace" width="960" />
</p>

| Screenshot | What it shows |
| --- | --- |
| PromptBeat evaluation | Multi-model safety eval overview — PASS / FAIL / REVIEW plus ASR-style metrics |
| AgentBeat evaluation | Real agent runtime report (Codex app-server) with trace-backed findings |
| Dataset build cycle | Promote / rewrite / reject outcomes that grow a regression baseline |
| Case Explorer | Case-level list with status, risk, model, and evidence actions |
| Case detail | Expected vs actual, judge policy, and Agent Trace for a FAIL case |

Source demos: `demo/reports/demo-agent-showcase.html`, `demo/reports/demo-codex-agent.html`, `demo/reports/cycle-report.html`.

## Why AI Beat

Most teams still rely on one of these:

| Common approach | What breaks |
| --- | --- |
| Manual red teaming | Hard to scale, hard to reproduce, hard to regress after every model/prompt change |
| Fixed benchmark sets | Limited coverage; new attack expressions keep appearing |
| Single score reports | No durable baseline when models, tools, or policies change |
| Answer-only judges | An agent can look safe in text while leaking secrets via tools or files |

AI Beat turns that into an engineering loop:

```text
scenario + seeds/datasets + attack strategies
  → real target execution
  → judge + evidence
  → promote / rewrite / reject
  → versioned regression baseline
```

## PromptBeat & AgentBeat

| | **PromptBeat** | **AgentBeat** |
| --- | --- | --- |
| One-line role | **Find risk** — generate, run, score, and grow attack cases | **Prove the step** — observe runtime behavior and collect evidence |
| Best for | LLMs, RAG apps, simple agents, model comparison | Tool-using / coding / workflow agents |
| Core question | Is there a security risk, and can I build a reusable test set? | Did the agent actually overreach — which tool, file, or step? |
| Main evidence | Attack case, model output, risk score, finding | Tool calls, command traces, file/env diffs, side effects |
| Typical output | Red-team cases, ASR / coverage, golden datasets | Runtime evidence chain, reproducible attack path, fix/retest pack |

### PromptBeat — generate, execute, improve

PromptBeat is the **test-generation and evaluation layer**:

1. **Scenario-driven risk modeling** — define who you test, which risks matter, and what counts as failure  
2. **Seed & dataset intake** — public benchmarks, internal corpora, or subscription packs  
3. **Attack generation & rewrite** — expand expressions, strategies, and encodings  
4. **Real target execution** — LLM APIs, HTTP agents, coding agents, adapters  
5. **Standardized judging** — PASS / FAIL / REVIEW with severity  
6. **Data loop** — promote hard hits, rewrite near-misses, reject noise into a versioned baseline

**What you can do with PromptBeat**

- Red-team an LLM or RAG app before release  
- Compare models/providers on the **same attack set and judge**  
- Build a living safety baseline instead of a static spreadsheet  
- Start from dataset subscriptions (HarmBench, JailbreakBench, JADE-DB, SALAD-Bench, and more when local raw data is available)  
- Keep lineage from seed → generated case → finding → report  

### AgentBeat — answer + process + environment

A safe-looking reply can still be a failure:

```text
Task: generate a support package for troubleshooting
Answer: looks fine — no secrets in the chat
Process: ran  env | sort > env_dump.txt
Environment: sensitive values written to disk  → FAIL
```

AgentBeat is the **runtime observation and forensics layer**:

1. Connect the real agent (SDK / HTTP / adapter)  
2. Run scenario-bound tasks with explicit forbidden boundaries  
3. Capture **answer + execution trace + environment change**  
4. Locate the step that crossed the line  
5. Package findings for fix verification and retest  

Use PromptBeat when you need coverage and a growing attack corpus.  
Use AgentBeat when “it refused in text” is not enough — you need to know **which action** failed.

## Product boundary

| AI Beat is | AI Beat is not |
| --- | --- |
| Automated evaluation on real targets | A runtime blocking gateway / WAF |
| Evidence-grade findings + regression data | A dump of attack prompts only |
| A complement to human red teaming | A full replacement for expert review on critical findings |
| PromptBeat (cases) + AgentBeat (runtime proof) | A claim of “100% coverage” or “absolute safety” |

## Quick Start

Download a release for your platform, unpack it, then from the package root:

```bash
./bin/promptbeat --version
```

Configure provider roles for the basic LLM example:

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

```bash
# validate → generate → evaluate → report
./bin/promptbeat validate --config examples/llm-basic/promptbeat.yaml

./bin/promptbeat generate \
  --config examples/llm-basic/promptbeat.yaml \
  --output artifacts/llm-basic/cases.json

./bin/promptbeat eval \
  --config artifacts/llm-basic/promptfoo.redteam.yaml \
  --output-dir artifacts/llm-basic/eval

./bin/promptbeat report \
  --input artifacts/llm-basic/eval/evaluation_result.json \
  --output artifacts/llm-basic/report.html
```

Prefer source checkout?

```bash
cd core/go
go run ./cmd/promptbeat -- --version
```

## Start with examples

Pick the closest target shape, copy the example, then swap providers and scenarios.

| Example | Use it when |
| --- | --- |
| `examples/bootstrap/` | You want the smallest end-to-end path |
| `examples/llm-basic/` | Single-model safety eval |
| `examples/multi-llm/` | Side-by-side provider comparison |
| `examples/dataset-subscriptions/safety-baseline/` | Start from reusable dataset subscriptions |
| `examples/http-agent/` | Business agent exposed over HTTP |
| `examples/codex_agent/` | Coding agent / runtime-trace style evaluation |
| `examples/agent-adapters/` | Custom agent runtime adapters |
| `examples/china-compliance/` | Risk taxonomy + China compliance walkthrough |
| `examples/scc_waf/` | SCC / AI-WAF oriented scenarios |

### Dataset subscriptions

```yaml
seeds:
  subscriptions:
    file: ../../../subscriptions/safety-baseline.yaml
    include:
      - safety-baseline
    overrides:
      safety-baseline:
        limit: 5
```

Large raw benchmarks are not bundled. Point PromptBeat at a local raw dataset root when needed:

```bash
export PROMPTBEAT_DATASETS_DIR=/path/to/promptbeat/datasets/raw
```

## Supported targets

- Standard LLM providers  
- HTTP services wrapping business agents  
- Codex SDK and coding-agent runtimes  
- Claude Code, OpenCode, OpenClaw, or internal systems via adapters  
- Controlled Target Lab / Inspect-style environments  

Adapters should return the final answer and, when available, **trace evidence**: commands, tool calls, file changes, network events, policy denials.

## Core concepts

| Concept | Meaning |
| --- | --- |
| **Target** | Model, app, or agent under test |
| **Scenario** | Risk objective, success/failure boundary, taxonomy, judge policy |
| **Seed** | Initial attack material before generation |
| **Subscription** | Reusable dataset / seed-source plan |
| **Attack recipe** | Repeatable strategy or transform |
| **Provider / Adapter** | Execution contract for LLMs, HTTP, CLI, or agent runtimes |

## Skills (lower the barrier)

Natural-language entry points for AI coding assistants:

| Skill | Purpose |
| --- | --- |
| `promptbeat-getting-started` | Route into the right evaluation path |
| `promptbeat-select-risk-pack` | Choose scenarios, seeds, and strategies |
| `promptbeat-run-quick-eval` | Run a small eval and locate artifacts |
| `promptbeat-connect-coding-agent` | Wire a coding-agent target |
| `promptbeat-debug-run` | Diagnose common config/runtime issues |

See `promptbeat-skills/`.

## Repository map

This repo is **product + examples first** (binary distribution for day-to-day use):

| Path | Purpose |
| --- | --- |
| `core/go/` | PromptBeat CLI core |
| `examples/` | Runnable LLM / agent / compliance projects |
| `subscriptions/` | Dataset subscription packs |
| `promptbeat-skills/` | Assistant skills for common workflows |
| `docs/` | Design notes, promo messaging, methodology |
| `website/` | Documentation site source |
| `api/` | Web/API service around generation capabilities |

## Learn more

- [Usage guide](docs/usage-guide.md)  
- [Scenario-driven evaluation](website/getting-started/scenario-driven-evaluation.mdx)  
- [Agent targets](website/targets/agent-targets.mdx)  
- [Dataset catalog](website/datasets/catalog.mdx)  
- [Releases](https://github.com/tophant-ai/promptbeat/releases)  

---

<div align="center">
  <sub>AI Beat Series · PromptBeat finds risk · AgentBeat proves the step · Continuous retest keeps every AI update honest</sub>
</div>
