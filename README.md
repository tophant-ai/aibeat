<div align="center">
  <img src="promptbeat-logo.svg" alt="Promptbeat logo" width="180" />

  <h1>Promptbeat</h1>

  <p><strong>Break your AI before they do.</strong></p>
  <p>Scenario-driven AI red teaming for LLMs and agent applications.</p>
  <p>面向 LLM 与 Agent 的场景驱动红队评测、数据集构建与证据化报告工具链。</p>

  <p>
    <a href="https://github.com/tophant-ai/aibeat/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/tophant-ai/aibeat?style=flat&logo=github&label=Stars" /></a>
    <a href="https://github.com/tophant-ai/aibeat/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/tophant-ai/aibeat?style=flat&label=release&color=2dd288" /></a>
    <img alt="Binary distribution" src="https://img.shields.io/badge/distribution-binary-111111" />
    <img alt="AI Red Teaming" src="https://img.shields.io/badge/AI-Red%20Teaming-7c3aed" />
    <img alt="LLM and Agent targets" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" />
  </p>

  <p>
    <a href="#quick-start"><strong>Quick Start</strong></a>
    · <a href="https://github.com/tophant-ai/aibeat/releases"><strong>Releases</strong></a>
    · <a href="https://promptbeat.mintlify.app"><strong>Docs</strong></a>
    · <a href="examples/"><strong>Examples</strong></a>
    · <a href="https://promptbeat.mintlify.app/datasets/catalog"><strong>Dataset Catalog</strong></a>
  </p>
</div>

---

Promptbeat turns **targets, scenarios, seed sources, attack recipes, and provider adapters** into reproducible red-team cases. Generate attacks, evaluate real LLM or Agent targets, keep the evidence, and ship traceable reports.

Promptbeat 将 **目标画像、风险场景、种子来源、攻击策略与执行适配器** 组合成可复现的红队用例，贯通攻击生成、真实靶标评测、证据留存与报告输出。

This public repository is **example-first**: runnable configs, dataset subscription templates, and product documentation. Promptbeat itself ships as prebuilt binary packages.

本公开仓库以**可运行示例**为主，提供评测配置、数据集订阅模板与产品文档。Promptbeat 本体以预构建二进制包分发。

<table>
  <tr>
    <td width="25%"><strong>🎯 Scenario-driven</strong><br />Organize evaluation around risk scenarios, success criteria, and judge policy — not isolated prompts.<br />以风险场景、成功标准和 Judge 策略组织评测。</td>
    <td width="25%"><strong>🧬 Dataset-aware</strong><br />Start from seeds, dataset subscriptions, multi-turn construction, and full sample lineage.<br />支持 Seed、数据集订阅、多轮构造与样本血缘。</td>
    <td width="25%"><strong>🤖 Agent-ready</strong><br />Cover plain LLMs, HTTP agents, coding agents, and custom runtime adapters.<br />覆盖普通 LLM、HTTP Agent、Coding Agent 与自定义 Adapter。</td>
    <td width="25%"><strong>🔎 Evidence-first</strong><br />Keep answers, judgments, tool calls, file changes, and other auditable traces.<br />保留回答、判定、工具调用、文件变化等可审计证据。</td>
  </tr>
</table>

## Why Promptbeat / 为什么选择 Promptbeat

Most safety checks stop at a prompt and a yes/no label. Real agent failures span tools, files, commands, network, policies, and hidden verifiers. Promptbeat is built for that gap:

- **Scenario first** — decide what risk you are proving, then generate or load the probes.
- **Real targets** — evaluate the system you ship, not only a chat completion endpoint.
- **Traceable results** — reports should explain *what failed* and *why it counts*, not only ASR.
- **Repeatable workflow** — configs, seeds, adapters, and outputs stay reviewable by another engineer.

多数安全检查停在“一条 prompt + 一个是否越狱”。真实 Agent 故障往往跨越工具、文件、命令、网络、策略和隐藏 verifier。Promptbeat 面向这条完整链路：

- **场景优先**：先定义要证明的风险，再生成或加载探测样本。
- **真实靶标**：评测你真正上线的系统，而不仅是 chat completion 接口。
- **结果可解释**：报告要说明失败点与判定依据，而不是只给 ASR。
- **流程可复现**：配置、种子、适配器和产物都能被他人复查。

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

## Install / 安装

Download the latest binary package from [Releases](https://github.com/tophant-ai/aibeat/releases/latest), unpack it, and run Promptbeat from the package root.

从 [Releases](https://github.com/tophant-ai/aibeat/releases/latest) 下载对应平台的二进制包，解压后在包根目录执行：

| Asset | Platform |
| --- | --- |
| `promptbeat-*-darwin-arm64.tar.gz` | macOS Apple Silicon |
| `promptbeat-*-darwin-x64.tar.gz` | macOS Intel |
| `promptbeat-*-linux-x64.tar.gz` | Linux x86_64 |

```bash
tar xf promptbeat-*-<platform>.tar.gz
cd promptbeat-*-<platform>
./bin/promptbeat --version
```

No separate Python, Node.js, or promptfoo install is required for the release package.

使用发布包时，无需额外安装 Python、Node.js 或 promptfoo。

<a id="quick-start"></a>
## Quick Start / 快速开始

Clone this repository for examples, then point the binary at a starter config:

克隆本仓库获取示例，再用二进制指向 starter 配置：

```bash
git clone https://github.com/tophant-ai/aibeat.git
cd aibeat

export OPENAI_API_KEY="sk-..."

./bin/promptbeat validate \
  --config examples/llm-basic/promptbeat.yaml

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

> Tip: put the downloaded `./bin/promptbeat` on your `PATH`, or run it with an absolute path next to this checkout.
>
> 提示：把下载的 `./bin/promptbeat` 放到 `PATH`，或在本仓库旁用绝对路径调用。

## Start with examples / 从示例开始

Pick the example closest to your target, copy it into a project workspace, and replace target / provider settings.

选择最接近被测系统的示例，复制后替换 Target、Provider 与场景参数。

| Example | Purpose | 中文说明 |
| --- | --- | --- |
| [`examples/bootstrap/`](examples/bootstrap/) | Minimal customer-support red-team run. | 最小客服红队示例。 |
| [`examples/llm-basic/`](examples/llm-basic/) | Single-LLM safety evaluation. | 单模型安全评测。 |
| [`examples/multi-llm/`](examples/multi-llm/) | Compare multiple providers side by side. | 多模型横向对比。 |
| [`examples/dataset-subscriptions/safety-baseline/`](examples/dataset-subscriptions/safety-baseline/) | Start from dataset subscriptions. | 从数据集订阅启动评测。 |
| [`examples/http-agent/`](examples/http-agent/) | Evaluate an Agent exposed through HTTP. | 评测通过 HTTP 暴露的 Agent。 |
| [`examples/codex_agent/`](examples/codex_agent/) | Codex SDK coding-agent target. | Codex SDK 编程 Agent 示例。 |
| [`examples/agent-adapters/`](examples/agent-adapters/) | Adapter templates for Claude Code / OpenCode / OpenClaw. | Agent Runtime 适配器模板。 |
| [`examples/scc_waf/`](examples/scc_waf/) | SCC / AI-WAF-oriented scenario. | SCC / AI-WAF 场景示例。 |

## Dataset subscriptions / 数据集订阅

Load initial attack material from reusable dataset subscriptions instead of handwriting a new `seeds.yaml` for every project.

通过可复用的数据集订阅加载初始攻击素材，无需为每个项目手写 `seeds.yaml`。

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

Raw benchmark datasets are not bundled. Point Promptbeat at a local raw dataset directory when needed:

原始 benchmark 数据默认不随示例打包。需要时把 Promptbeat 指向本地原始数据集目录：

```bash
export PROMPTBEAT_DATASETS_DIR=/path/to/promptbeat/datasets/raw

./bin/promptbeat validate \
  --config examples/dataset-subscriptions/safety-baseline/promptbeat.yaml
```

Catalog sources include HarmBench, JailbreakBench behaviors, Do-Not-Answer, XSTest, ToxicChat, ALERT, JADE-DB, BeaverTails, OR-Bench, and SALAD-Bench when raw files are available locally.

See the live catalog: [Dataset Catalog](https://promptbeat.mintlify.app/datasets/catalog)

## Supported targets / 支持的靶标形态

- Standard LLM providers
- HTTP services wrapping business agents
- Codex SDK and coding-agent runtimes
- Claude Code, OpenCode, OpenClaw, or internal systems through adapters
- Controlled Target Lab / Inspect environments

Adapters should expose the final answer and, when available, trace evidence such as commands, tool calls, file changes, network events, or policy denials.

## Documentation / 文档

| Resource | Link |
| --- | --- |
| Product docs | [promptbeat.mintlify.app](https://promptbeat.mintlify.app) |
| Getting started | [Scenario-driven evaluation](https://promptbeat.mintlify.app/getting-started/scenario-driven-evaluation) |
| Dataset catalog | [Datasets](https://promptbeat.mintlify.app/datasets/catalog) |
| Releases | [github.com/tophant-ai/aibeat/releases](https://github.com/tophant-ai/aibeat/releases) |
| Website source in this repo | [`website/`](website/) |

## Repository layout / 仓库结构

| Path | Purpose |
| --- | --- |
| `examples/` | Runnable Promptbeat projects for LLM, HTTP Agent, coding-agent, and dataset workflows. |
| `subscriptions/` | Reusable dataset subscription configs. |
| `website/` | Documentation website source. |
| `promptbeat-logo.svg` | Brand mark used by this homepage. |

## Security note / 安全说明

Promptbeat is a red-teaming toolkit. Use it only on systems you own or are explicitly authorized to test. Generated prompts and evaluation artifacts may contain sensitive or harmful content — handle outputs carefully and keep them out of public issue trackers unless sanitized.

Promptbeat 是红队评测工具。请仅在你拥有或已获明确授权的系统上使用。生成样本与评测产物可能包含敏感或有害内容，请妥善保管，避免未经脱敏直接公开。

## Community / 社区

- Star the repo if Promptbeat helps your AI safety workflow.
- Open issues for bugs, docs gaps, and public example requests.
- Prefer private channels for vulnerability reports against production systems.

如果 Promptbeat 对你的 AI 安全评测有帮助，欢迎 Star。公开 issue 适合反馈 bug、文档缺口和示例需求；针对生产系统的漏洞报告请走私密渠道。
