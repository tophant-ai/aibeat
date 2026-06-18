<div align="center">
  <img src="promptbeat-logo.svg" alt="Promptbeat logo" width="180" />

  <h1>Promptbeat</h1>

  <p><strong>Scenario-driven AI red teaming for LLMs and agent applications.</strong></p>
  <p>面向 LLM 与 Agent 的场景驱动红队评测、数据集构建与证据化报告工具链。</p>

  <p>
    <a href="https://github.com/tophant-ai/promptbeat/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/tophant-ai/promptbeat?style=flat&logo=github&label=Stars" /></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-2dd288" />
    <!-- <img alt="Binary distribution" src="https://img.shields.io/badge/distribution-binary-111111" /> -->
    <img alt="AI Red Teaming" src="https://img.shields.io/badge/AI-Red%20Teaming-7c3aed" />
    <!-- <img alt="LLM and Agent targets" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" /> -->
  </p>

  <p>
    <a href="#quick-start"><strong>Quick Start</strong></a>
    · <a href="https://github.com/tophant-ai/promptbeat/releases"><strong>Releases</strong></a>
    · <a href="examples/"><strong>Examples</strong></a>
    · <a href="website/"><strong>Documentation</strong></a>
    · <a href="website/datasets/catalog.mdx"><strong>Dataset Catalog</strong></a>
  </p>
</div>

---

Promptbeat turns **targets, scenarios, seed sources, attack recipes, and provider adapters** into reproducible red-team cases. It generates attacks, evaluates real LLM or Agent targets, normalizes evidence, and produces traceable reports and dataset artifacts.

Promptbeat 将 **目标画像、风险场景、种子来源、攻击策略与执行适配器** 组合为可复现的红队用例，并贯通攻击生成、真实靶标评测、结果归一化、证据留存与报告输出。

Promptbeat is distributed as prebuilt binary packages. This repository is **example-first** and primarily provides runnable configurations, dataset subscription templates, and product documentation.

Promptbeat 当前以预构建二进制包分发。本仓库以**可运行示例**为主，主要提供评测配置、数据集订阅模板与产品文档。

<table>
  <tr>
    <td width="25%"><strong>🎯 Scenario-driven</strong><br />以风险场景、成功标准和 Judge 策略组织评测，而不是只执行孤立 Prompt。</td>
    <td width="25%"><strong>🧬 Dataset-aware</strong><br />支持 Seed 文件、Dataset Subscription、多轮构造与完整样本血缘。</td>
    <td width="25%"><strong>🤖 Agent-ready</strong><br />面向普通 LLM、HTTP Agent、Coding Agent 与自定义 Runtime Adapter。</td>
    <td width="25%"><strong>🔎 Evidence-first</strong><br />保留回答、判定、工具调用、文件变化及其他可审计证据。</td>
  </tr>
</table>

## Core workflow / 核心流程

```text
target profile
  + scenario / risk taxonomy
  + seed files or dataset subscriptions
  + attack recipe
  + provider / agent adapter
  → generated attack cases
  → evaluation against real targets
  → normalized findings and evidence
  → reports / benchmark artifacts
```

### Core concepts / 核心抽象

| Concept | Meaning | 中文说明 |
| --- | --- | --- |
| **Target** | The LLM or Agent application under test. | 被测模型、Agent 或目标画像。 |
| **Scenario** | Risk objective, success criteria, taxonomy binding, and judge strategy. | 风险场景、成功标准、分类映射和判定策略。 |
| **Seed** | Initial attack material or intent before generation. | 生成前的初始攻击素材或攻击意图。 |
| **Subscription** | A reusable seed-source plan, often backed by benchmark datasets. | 可复用的数据集或 Seed 来源订阅。 |
| **Attack Recipe** | A repeatable transformation or attack strategy. | 可复用的攻击变换与策略。 |
| **Provider / Adapter** | Execution contract for an LLM, HTTP service, Codex, or Agent runtime. | LLM、HTTP 服务、Codex 或 Agent Runtime 的执行接入契约。 |

<a id="quick-start"></a>
## Quick Start / 快速开始

Download and unpack the release package for your platform, then run Promptbeat from the package root.

下载并解压对应平台的二进制发布包，然后在发布包根目录执行：

```bash
./bin/promptbeat --version

./bin/promptbeat validate \
  --config examples/llm-basic/promptbeat.yaml
```

Generate adversarial cases:

```bash
export OPENAI_API_KEY="sk-..."

./bin/promptbeat generate \
  --config examples/llm-basic/promptbeat.yaml \
  --output artifacts/llm-basic/cases.json
```

Evaluate and generate a report:

```bash
./bin/promptbeat eval \
  --config artifacts/llm-basic/promptfoo.redteam.yaml \
  --output-dir artifacts/llm-basic/eval

./bin/promptbeat report \
  --input artifacts/llm-basic/eval/evaluation_result.json \
  --output artifacts/llm-basic/report.html
```

## Start with examples / 从示例开始

The fastest way to understand Promptbeat is to select the example closest to your target, copy it into a project workspace, and replace the target and provider settings.

理解 Promptbeat 最快的方式，是从最接近被测系统的示例出发，复制配置后替换 Target、Provider 与场景参数。

| Example | Purpose | 中文说明 |
| --- | --- | --- |
| `examples/bootstrap/` | Minimal customer-support red-team run. | 最小客服红队示例。 |
| `examples/llm-basic/` | Single-LLM safety evaluation. | 单模型安全评测。 |
| `examples/multi-llm/` | Compare multiple providers side by side. | 多模型横向对比。 |
| `examples/dataset-subscriptions/safety-baseline/` | Start from dataset subscriptions. | 从数据集订阅启动评测。 |
| `examples/http-agent/` | Evaluate an Agent exposed through HTTP. | 评测通过 HTTP 暴露的 Agent。 |
| `examples/codex_agent/` | Codex SDK coding-agent target. | Codex SDK 编程 Agent 示例。 |
| `examples/agent-adapters/` | Adapter templates for Agent runtimes. | Agent Runtime 适配器模板。 |
| `examples/china-compliance/` | Risk taxonomy and China compliance walkthrough. | 风险分类与中国合规示例。 |
| `examples/scc_waf/` | SCC / AI-WAF-oriented scenario. | SCC / AI-WAF 场景示例。 |

## Dataset subscriptions / 数据集订阅

Promptbeat can load initial attack material from reusable dataset subscriptions instead of maintaining a separate handwritten `seeds.yaml` for every project.

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

Raw benchmark datasets are not bundled with release examples. Point Promptbeat to a local raw dataset directory when needed:

```bash
export PROMPTBEAT_DATASETS_DIR=/path/to/promptbeat/datasets/raw

./bin/promptbeat validate \
  --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml
```

The catalog supports sources such as HarmBench, JailbreakBench behaviors, Do-Not-Answer, XSTest, ToxicChat, ALERT, JADE-DB, BeaverTails, OR-Bench, and SALAD-Bench when their raw files are available locally.

## Supported target patterns / 靶标接入形态

- Standard LLM providers.
- HTTP services wrapping business Agents.
- Codex SDK and coding-agent runtimes.
- Claude Code, OpenCode, OpenClaw, or internal systems through adapters.
- Controlled Target Lab / Inspect environments.

An adapter should expose the final answer and, when available, trace evidence such as commands, tool calls, file changes, network events, or policy denials.
