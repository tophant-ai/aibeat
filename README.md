# Promptbeat

Promptbeat is a scenario-driven safety evaluation toolkit for LLMs and agent applications. It starts from targets, scenarios, seeds, and dataset subscriptions, then generates and evaluates adversarial cases against real model or agent targets.

Promptbeat 是一个面向 LLM 与 Agent 应用的场景驱动安全评测工具。它从 target、scenario、seed 和 dataset subscription 出发，生成并执行对抗测试，用于评估真实模型或真实 Agent 的安全边界。

## What This Repository Contains / 仓库内容

This public repository is for documentation, website content, and runnable configuration examples. It is not the full product source release.

本公开仓库用于放置官网内容、说明文档和可运行配置示例，不作为完整产品源码开源仓库。

Included:

- `website/` — Mintlify documentation site with English and Chinese pages.
- `examples/` — public Promptbeat configuration examples.
- `subscriptions/` — seed-source subscription templates for dataset-started evaluation.

包含内容：

- `website/` — Mintlify 官网文档，包含英文和中文页面。
- `examples/` — Promptbeat 公开配置示例。
- `subscriptions/` — 从数据集启动评测的 seed source 订阅模板。

Not included:

- Core product source code.
- API service source code.
- Raw benchmark datasets.
- Private run artifacts, reports, credentials, or internal deployment files.

不包含内容：

- 核心产品源码。
- API 服务源码。
- 原始 benchmark 数据集。
- 私有运行产物、报告、凭据或内部部署文件。

## Core Idea / 核心思路

Promptbeat treats a test as a scenario-driven decision, not just a model prompt.

Promptbeat 把评测看成场景驱动的决策过程，而不只是单条 prompt 测试。

```text
target profile
  + scenario / risk taxonomy
  + seed files or dataset subscriptions
  + provider / agent adapter
  -> generated attack cases
  -> eval against real target
  -> report with evidence
```

Key abstractions / 关键抽象：

| Concept | Meaning | 中文说明 |
| --- | --- | --- |
| Target | The model or agent application under test. | 被测模型或 Agent 应用。 |
| Scenario | The risk situation, success criteria, and judge strategy. | 风险场景、成功标准和判断方式。 |
| Seed | Initial attack material before generation. | 生成前的初始攻击素材。 |
| Subscription | A reusable seed-source plan, often backed by datasets. | 可复用的 seed 来源订阅，通常由数据集驱动。 |
| Provider / Adapter | The execution contract for an LLM, HTTP service, Codex, or agent runtime. | LLM、HTTP 服务、Codex 或其他 Agent runtime 的执行接入方式。 |

## Example Matrix / 示例矩阵

| Path | Purpose | 中文说明 |
| --- | --- | --- |
| `examples/bootstrap/` | Minimal customer-support red-team example. | 最小电商客服红队示例。 |
| `examples/llm-basic/` | Single LLM safety evaluation. | 单模型安全评测。 |
| `examples/multi-llm/` | Compare multiple LLM providers side by side. | 多模型横向对比。 |
| `examples/dataset-subscriptions/safety-baseline/` | Start from dataset subscriptions. | 从数据集订阅启动评测。 |
| `examples/http-agent/` | Evaluate an agent exposed through an HTTP endpoint. | 评测通过 HTTP 暴露的 Agent。 |
| `examples/codex_agent/` | Codex SDK coding-agent target example. | Codex SDK 编程 Agent 示例。 |
| `examples/agent-adapters/` | Adapter templates for Claude Code, OpenCode, and OpenClaw. | Claude Code、OpenCode、OpenClaw 适配器模板。 |
| `examples/scc_waf/` | SCC / AI-WAF oriented scenario example. | SCC / AI-WAF 场景示例。 |

## Quick Start / 快速开始

Install or unpack a Promptbeat release package, then run from the package root.

安装或解压 Promptbeat release 包后，在包根目录执行：

```bash
./bin/promptbeat --version
```

Validate a basic LLM example:

校验基础 LLM 示例：

```bash
./bin/promptbeat validate --config examples/llm-basic/promptbeat.yaml
```

Generate attack cases:

生成攻击用例：

```bash
export OPENAI_API_KEY="sk-..."

./bin/promptbeat generate \
  --config examples/llm-basic/promptbeat.yaml \
  --output-dir artifacts/llm-basic/generate
```

Evaluate the generated config:

执行评测：

```bash
./bin/promptbeat eval \
  --config artifacts/llm-basic/generate/generated_redteam.yaml \
  --output-dir artifacts/llm-basic/eval
```

Generate a report:

生成报告：

```bash
./bin/promptbeat report \
  --eval-result artifacts/llm-basic/eval/evaluation_result.json \
  --output artifacts/llm-basic/report.html
```

## Dataset Subscriptions / 数据集订阅

Promptbeat can load initial seeds from dataset subscriptions instead of hand-written seed files.

Promptbeat 支持通过 dataset subscription 加载初始 seed，而不必在每个项目里手写 `seeds.yaml`。

Example:

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

Raw datasets are not bundled in this public repository or release examples. Point Promptbeat to a local raw dataset directory when needed:

公开仓库和 release 示例不内置原始数据集。需要使用本地数据集时，可以指定 raw dataset 目录：

```bash
export PROMPTBEAT_DATASETS_DIR=/path/to/promptbeat/datasets/raw

./bin/promptbeat validate \
  --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml
```

The subscription file can reference catalog datasets such as HarmBench, JailbreakBench behaviors, Do-Not-Answer, XSTest, ToxicChat, ALERT, JADE-DB, BeaverTails, OR-Bench, SALAD-Bench, and others when their raw files are available locally.

当本地 raw 文件可用时，订阅文件可以引用 HarmBench、JailbreakBench behaviors、Do-Not-Answer、XSTest、ToxicChat、ALERT、JADE-DB、BeaverTails、OR-Bench、SALAD-Bench 等数据集。

## Agent Targets / Agent 靶标

Promptbeat models agent applications as first-class targets. A target can be:

Promptbeat 将 Agent 应用作为一等靶标建模。target 可以是：

- A normal LLM provider.
- An HTTP service wrapping a business agent.
- Codex SDK / coding-agent runtime.
- Claude Code, OpenCode, OpenClaw, or internal agent through an adapter.
- A future Inspect / Target Lab controlled environment.

对应中文：

- 普通 LLM provider。
- 包装业务 Agent 的 HTTP 服务。
- Codex SDK / 编程 Agent runtime。
- 通过 adapter 接入的 Claude Code、OpenCode、OpenClaw 或内部 Agent。
- 后续由 Inspect / Target Lab 控制的环境。

The important contract is that the adapter should expose the final answer and, when possible, trace evidence such as commands, tool calls, file changes, network events, or policy denials.

关键契约是：adapter 应暴露最终回答，并尽可能提供 trace 证据，例如命令、工具调用、文件变化、网络事件或策略拒绝。

## Website / 官网

The documentation site lives in `website/` and is managed independently from product/runtime dependencies.

官网位于 `website/`，其依赖独立管理，不和核心产品、API 服务或其他运行时依赖混在一起。

```bash
cd website
npm install
npm run dev
```

Mintlify hosting can deploy from the `website/` project root. Custom domains can be configured in the Mintlify dashboard after the docs project is connected.

Mintlify 可以直接从 `website/` 目录部署。连接 docs 项目后，可以在 Mintlify 控制台配置自定义域名。

## Status / 当前状态

- Codex SDK path has a runnable example.
- HTTP agent path is a generic runnable adapter pattern.
- Dataset subscription loading supports catalog datasets when raw files are available locally.
- Claude Code, OpenCode, and OpenClaw examples are adapter templates until connected to real runtimes and validated with saved reports.

中文状态：

- Codex SDK 路径已有可运行示例。
- HTTP Agent 路径是通用可运行 adapter 形态。
- Dataset subscription 在本地 raw 文件可用时支持 catalog 数据集。
- Claude Code、OpenCode、OpenClaw 当前是 adapter 模板，需连接真实 runtime 并产出报告后才算完成验证。
