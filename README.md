<div align="center">
  <p>
    <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat logo" height="72" />
    &nbsp;&nbsp;
    <img src="docs/assets/agentbeat-logo.svg" alt="AgentBeat logo" height="72" />
  </p>

  <h1>AI Beat · PromptBeat &amp; AgentBeat</h1>

  <p><strong>Stop treating AI safety as a one-off red-team project.</strong></p>
  <p>
    Scenario-driven red teaming for LLMs, RAG apps, and real agent runtimes —
    from attack generation to evidence-grade reports.
  </p>

  <p>
    <a href="README.zh-CN.md"><strong>中文</strong></a>
    ·
    <a href="https://github.com/tophant-ai/aibeat/releases"><strong>Releases</strong></a>
    ·
    <a href="examples/"><strong>Examples</strong></a>
    ·
    <a href="https://promptbeat.mintlify.app"><strong>Docs</strong></a>
  </p>

  <p>
    <a href="https://github.com/tophant-ai/aibeat/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/tophant-ai/aibeat?style=flat&logo=github&label=Stars" /></a>
    <a href="https://github.com/tophant-ai/aibeat/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/tophant-ai/aibeat?style=flat&label=release&color=2dd288" /></a>
    <img alt="AI Red Teaming" src="https://img.shields.io/badge/AI-Red%20Teaming-7c3aed" />
    <img alt="LLM + Agent" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" />
    <img alt="Evidence-first" src="https://img.shields.io/badge/evidence-answer%20%2B%20trace-111111" />
  </p>
</div>

<br />

<p align="center">
  <img src="demo/recordings/videos/hero.gif" alt="PromptBeat live red-team evaluation TUI" width="920" />
</p>

---

**PromptBeat** finds and upgrades attack cases.  
**AgentBeat** verifies whether a real agent actually crossed the line — with tools, files, and environment evidence, not just the final chat reply.

```text
PromptBeat: discover risk
    → AgentBeat: verify real behavior
    → findings + regression data feed the next round
```

> Built for **pre-release acceptance, continuous regression, and evidence-grade findings**.  
> It is **not** a runtime WAF / gateway.

## The problem

| Common approach | What breaks |
| --- | --- |
| Manual red teaming | Hard to scale, hard to reproduce, breaks after every model/prompt change |
| Fixed benchmark sets | Limited coverage; new attack expressions keep appearing |
| Single score reports | No durable baseline when models, tools, or policies change |
| Answer-only judges | An agent can look safe in text while leaking secrets via tools or files |

AI Beat turns that into an engineering loop:

```text
target + scenario + seeds/datasets + attack recipe
  → real execution
  → judge + evidence
  → promote / rewrite / reject
  → versioned regression baseline
```

## What you can do

- **Red-team LLMs and RAG apps** before release with scenario-driven cases  
- **Compare models/providers** on the **same attack set and judge**  
- **Evaluate real agents** (HTTP, coding agents, adapters) with runtime traces  
- **Grow a living safety baseline** instead of a static spreadsheet  
- **Drill into evidence** — PASS/FAIL overview → Case Explorer → case detail  
- **Start from datasets** via subscriptions (HarmBench, JailbreakBench, JADE-DB, SALAD-Bench, and more when local raw data is available)  
- **Drive the flow from an AI coding assistant** with PromptBeat Skills  

## Why AI Beat

| | Typical prompt tests | Static benchmarks | **AI Beat** |
| --- | --- | --- | --- |
| Object under test | Final text | Fixed dataset score | Text + tools + files + env |
| Attacks | Handwritten prompts | Frozen items | Generated + rewritten strategies |
| Evidence | Answer only | Aggregate number | Answer + trace + env diff + artifacts |
| Reuse | One-off | Static | Versioned promote / rewrite / reject loop |
| Agent behavior | Invisible | Out of scope | First-class |

## PromptBeat & AgentBeat

| | **PromptBeat** | **AgentBeat** |
| --- | --- | --- |
| Role | **Find risk** — generate, run, score, grow test sets | **Prove the step** — observe runtime and collect forensics |
| Best for | LLMs, RAG, simple agents, multi-model comparison | Tool-using / coding / workflow agents |
| Core question | Is there risk, and can I build a regression set? | Did it overreach — which tool, file, or step? |
| Main evidence | Cases, outputs, risk scores, findings | Tool calls, command traces, file/env diffs, side effects |
| Typical output | Red-team corpus, ASR/coverage, golden datasets | Evidence chain, reproducible path, fix/retest pack |

### PromptBeat — generate, execute, improve

1. Model risks as **scenarios** (who you test, what failure means)  
2. Load **seeds** or **dataset subscriptions**  
3. Generate and rewrite attacks (strategies + transforms)  
4. Run against real targets  
5. Judge with PASS / FAIL / REVIEW  
6. **Promote / rewrite / reject** into a versioned baseline  

### AgentBeat — answer + process + environment

A safe-looking reply can still be a failure:

```text
Task: generate a support package for troubleshooting
Answer: looks fine — no secrets in the chat
Process: ran  env | sort > env_dump.txt
Environment: sensitive values written to disk  → FAIL
```

AgentBeat records **answer + execution trace + environment change**, then points to the step that crossed the line.

**Rule of thumb**

- Need coverage and a reusable corpus → **PromptBeat**  
- Need to prove tools / permissions / memory / env side effects → **AgentBeat**  
- Best loop: **PromptBeat finds risk → AgentBeat verifies behavior → retest**

## Evidence-grade reports

Self-contained HTML reports: overview metrics, model performance, case list, and drill-down with Expected vs Actual, judge rationale, and agent trace.

<p align="center">
  <img src="docs/assets/screenshots/readme-report-promptbeat.png" alt="PromptBeat evaluation report overview" width="920" />
  <br />
  <sub>Multi-model evaluation overview — PASS / FAIL / REVIEW and performance metrics</sub>
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-explorer-promptbeat.png" alt="Case Explorer filtered to FAIL cases" width="920" />
  <br />
  <sub>Case Explorer — filter by status, risk, model; open evidence per case</sub>
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-detail-agentbeat.png" alt="AgentBeat case detail with judge and agent trace" width="920" />
  <br />
  <sub>Case detail — Expected vs Actual, judge decision, Agent Trace on FAIL</sub>
</p>

Demo sources: `demo/reports/demo-agent-showcase.html`, `demo/reports/demo-codex-agent.html`, `demo/reports/cycle-report.html`.

## Quick start

Download a [release](https://github.com/tophant-ai/aibeat/releases) for your platform, unpack it, then from the package root:

```bash
./bin/promptbeat --version
```

Configure provider roles for `examples/llm-basic`:

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

Run the loop:

```bash
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

From source:

```bash
cd core/go
go run ./cmd/promptbeat -- --version
```

## Start with examples

Pick the closest target shape, copy it, then swap providers and scenarios.

| Example | Use it when |
| --- | --- |
| `examples/bootstrap/` | Smallest end-to-end path |
| `examples/llm-basic/` | Single-model safety eval |
| `examples/multi-llm/` | Side-by-side provider comparison |
| `examples/dataset-subscriptions/safety-baseline/` | Start from reusable dataset subscriptions |
| `examples/http-agent/` | Business agent exposed over HTTP |
| `examples/codex_agent/` | Coding agent / runtime-trace evaluation |
| `examples/agent-adapters/` | Custom agent runtime adapters |
| `examples/china-compliance/` | Risk taxonomy + compliance walkthrough |
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

## Skills

Natural-language entry points for AI coding assistants (`promptbeat-skills/`):

| Skill | Purpose |
| --- | --- |
| `promptbeat-getting-started` | Route into the right evaluation path |
| `promptbeat-select-risk-pack` | Choose scenarios, seeds, and strategies |
| `promptbeat-run-quick-eval` | Run a small eval and locate artifacts |
| `promptbeat-connect-coding-agent` | Wire a coding-agent target |
| `promptbeat-debug-run` | Diagnose common config/runtime issues |

## Product boundary

| AI Beat is | AI Beat is not |
| --- | --- |
| Automated evaluation on real targets | A runtime blocking gateway / WAF |
| Evidence-grade findings + regression data | A dump of attack prompts only |
| A complement to human red teaming | A full replacement for expert review on critical findings |
| PromptBeat (cases) + AgentBeat (runtime proof) | A claim of “100% coverage” or “absolute safety” |

## Learn more

- [Documentation](https://promptbeat.mintlify.app)  
- [Usage guide](docs/usage-guide.md)  
- [Scenario-driven evaluation](website/getting-started/scenario-driven-evaluation.mdx)  
- [Agent targets](website/targets/agent-targets.mdx)  
- [Dataset catalog](website/datasets/catalog.mdx)  
- [Releases](https://github.com/tophant-ai/aibeat/releases)  

---

<div align="center">
  <sub>
    AI Beat Series · PromptBeat finds risk · AgentBeat proves the step ·
    Continuous retest keeps every AI update honest
  </sub>
</div>
