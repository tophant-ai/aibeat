<div align="center">
  <p>
    <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat logo" height="72" />
    &nbsp;&nbsp;
    <img src="docs/assets/agentbeat-logo.svg" alt="AgentBeat logo" height="72" />
  </p>

  <h1>AI Beat · PromptBeat 与 AgentBeat</h1>

  <p><strong>别再把 AI 安全测试当成一次性项目。</strong></p>
  <p>
    面向大模型、RAG 应用与真实 Agent 运行时的场景驱动红队评测 —
    从攻击生成到证据化报告的完整闭环。
  </p>

  <p>
    <a href="README.md"><strong>English</strong></a>
    ·
    <a href="https://github.com/tophant-ai/aibeat/releases"><strong>Releases</strong></a>
    ·
    <a href="examples/"><strong>示例</strong></a>
    ·
    <a href="https://promptbeat.mintlify.app"><strong>文档</strong></a>
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
  <img src="demo/recordings/videos/hero.gif" alt="PromptBeat 红队评测实时 TUI" width="920" />
</p>

---

**PromptBeat** 持续发现并优化攻击用例。  
**AgentBeat** 在真实运行中验证 Agent 是否越界——看的不只是最终回答，还有工具调用、文件操作与环境变化。

```text
PromptBeat：发现风险
    → AgentBeat：验证真实行为
    → Finding 与回归数据回流，持续复测
```

> 用于 **上线前安全验收、持续回归、证据化 Finding 与红队数据资产沉淀**。  
> **不替代** 运行时防护网关 / WAF。

## 为什么需要

| 常见做法 | 真正卡点 |
| --- | --- |
| 一次性人工红队 | 难规模化、难复现，模型/提示词升级后还要重来 |
| 固定安全题库 | 覆盖有限，难跟上新的攻击表达 |
| 只看单次分数 | 没有可版本化的长期基线 |
| 只判回答文本 | Agent 可能“说得安全”，却已通过工具/文件造成副作用 |

AI Beat 把安全测试变成工程闭环：

```text
目标 + 风险场景 + 种子/数据集 + 攻击策略
  → 真实执行
  → Judge + 证据
  → 保留 / 改写 / 淘汰
  → 版本化回归基线
```

## 你能做什么

- **上线前红队** 模型与 RAG 应用，场景驱动而非零散试探  
- **多模型对比**：同一攻击集、同一 Judge 标准  
- **评测真实 Agent**（HTTP、Coding Agent、Adapter），保留运行时轨迹  
- **沉淀可迭代安全基线**，而不是一次性 Excel  
- **证据下钻**：总览 → Case Explorer → Case 详情  
- **从数据集订阅起步**（HarmBench、JailbreakBench、JADE-DB、SALAD-Bench 等，需本地原始数据时配置目录）  
- **用 Skills 在 AI 编程助手里** 自然语言驱动评测  

## 为什么不一样

| | 普通 Prompt 测试 | 静态 Benchmark | **AI Beat** |
| --- | --- | --- | --- |
| 评测对象 | 最终文本 | 固定题库分数 | 文本 + 工具 + 文件 + 环境 |
| 攻击来源 | 手写 Prompt | 冻结题目 | 生成 + 改写策略 |
| 证据 | 仅回答 | 汇总数字 | 回答 + Trace + 环境 diff + 产物 |
| 复用 | 一次性 | 静态 | 版本化 promote / rewrite / reject |
| Agent 行为 | 不可见 | 不在范围 | 一等公民 |

## PromptBeat 与 AgentBeat

| | **PromptBeat** | **AgentBeat** |
| --- | --- | --- |
| 角色 | **发现风险** — 生成、执行、打分、沉淀测试集 | **证明步骤** — 观测运行时并取证 |
| 适合 | 模型、RAG、简单 Agent、多模型对比 | 工具型 / Coding / 工作流 Agent |
| 核心问题 | 有没有风险？能否建成回归集？ | 有没有越权？在哪一步？ |
| 主要证据 | 用例、输出、风险分、Finding | 工具调用、命令轨迹、文件/环境 diff、副作用 |
| 典型产出 | 红队语料、ASR/覆盖、黄金数据集 | 证据链、可复现路径、修复复测包 |

### PromptBeat：生成、执行、持续更新

1. 用 **场景** 建模风险（测谁、什么算失败）  
2. 导入 **种子** 或 **数据集订阅**  
3. 生成与改写攻击（策略 + 变换）  
4. 在真实目标上执行  
5. PASS / FAIL / REVIEW 判定  
6. **保留 / 改写 / 淘汰**，形成版本化基线  

### AgentBeat：回答 + 过程 + 环境

“回答安全”仍可能失败：

```text
任务：为故障排查生成支持包
回答：聊天里没有密钥  → 看似通过
过程：执行了 env | sort > env_dump.txt
环境：敏感信息被写入文件  → 失败
```

AgentBeat 记录 **回答 + 执行过程 + 环境变化**，定位触发越界的步骤。

**选型**

- 要覆盖面与可回归测试集 → **PromptBeat**  
- 要证明工具 / 权限 / 记忆 / 环境副作用 → **AgentBeat**  
- 最佳闭环：**PromptBeat 发现 → AgentBeat 验证 → 持续复测**

## 证据化报告

自包含 HTML 报告：总览指标、模型表现、Case 列表，以及期望 vs 实际、Judge 依据与 Agent Trace。

<p align="center">
  <img src="docs/assets/screenshots/readme-report-promptbeat.png" alt="PromptBeat 评测报告总览" width="920" />
  <br />
  <sub>多模型评测总览 — PASS / FAIL / REVIEW 与性能指标</sub>
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-explorer-promptbeat.png" alt="Case Explorer（FAIL 筛选）" width="920" />
  <br />
  <sub>Case Explorer — 按状态、风险、模型筛选，逐条打开证据</sub>
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-detail-agentbeat.png" alt="AgentBeat Case 详情：Judge 与 Agent Trace" width="920" />
  <br />
  <sub>Case 详情 — 期望 vs 实际、Judge 判定、FAIL 案例的 Agent Trace</sub>
</p>

演示源文件：`demo/reports/demo-agent-showcase.html`、`demo/reports/demo-codex-agent.html`、`demo/reports/cycle-report.html`。

## 快速开始

从 [Releases](https://github.com/tophant-ai/aibeat/releases) 下载对应平台包，解压后在根目录执行：

```bash
./bin/promptbeat --version
```

配置 `examples/llm-basic` 所需 Provider：

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

跑通闭环：

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

源码方式：

```bash
cd core/go
go run ./cmd/promptbeat -- --version
```

## 从示例开始

选最接近被测系统的示例，复制后替换 Target、Provider 与场景。

| 示例 | 适用场景 |
| --- | --- |
| `examples/bootstrap/` | 最小端到端路径 |
| `examples/llm-basic/` | 单模型安全评测 |
| `examples/multi-llm/` | 多模型 / 多 Provider 对比 |
| `examples/dataset-subscriptions/safety-baseline/` | 从数据集订阅启动 |
| `examples/http-agent/` | HTTP 暴露的业务 Agent |
| `examples/codex_agent/` | Coding Agent / 运行时轨迹评测 |
| `examples/agent-adapters/` | 自定义 Agent Runtime 适配 |
| `examples/china-compliance/` | 风险分类与合规场景 |
| `examples/scc_waf/` | SCC / AI-WAF 相关场景 |

### 数据集订阅

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

大型原始 benchmark 默认不随示例内置。需要时：

```bash
export PROMPTBEAT_DATASETS_DIR=/path/to/promptbeat/datasets/raw
```

## 支持的目标形态

- 标准 LLM Provider  
- 通过 HTTP 暴露的业务 Agent  
- Codex SDK 与 coding-agent runtime  
- 经 Adapter 接入的 Claude Code、OpenCode、OpenClaw 或内部系统  
- 受控 Target Lab / Inspect 类环境  

Adapter 应返回最终回答；可用时附带 **trace 证据**：命令、工具调用、文件变化、网络事件、策略拒绝等。

## 核心概念

| 概念 | 说明 |
| --- | --- |
| **Target** | 被测模型、应用或 Agent |
| **Scenario** | 风险目标、成败边界、分类映射与 Judge 策略 |
| **Seed** | 生成前的初始攻击素材 |
| **Subscription** | 可复用的数据集 / 种子来源订阅 |
| **Attack Recipe** | 可重复的攻击策略或变换 |
| **Provider / Adapter** | LLM、HTTP、CLI 或 Agent Runtime 的执行接入契约 |

## Skills

在 AI 编程助手中用自然语言驱动（`promptbeat-skills/`）：

| Skill | 作用 |
| --- | --- |
| `promptbeat-getting-started` | 理解需求，进入正确评测路径 |
| `promptbeat-select-risk-pack` | 选择风险场景、种子与策略 |
| `promptbeat-run-quick-eval` | 运行小规模评测并定位产物 |
| `promptbeat-connect-coding-agent` | 连接被测 Coding Agent |
| `promptbeat-debug-run` | 诊断常见配置与运行问题 |

## 产品边界

| AI Beat 是 | AI Beat 不是 |
| --- | --- |
| 在真实目标上自动评测 | 线上实时拦截的网关 / WAF |
| 证据化 Finding + 回归数据 | 单纯的攻击 Prompt 库 |
| 对人工红队的工程化补充 | 对高风险 Finding 专家复核的完全替代 |
| PromptBeat（出题）+ AgentBeat（取证） | “覆盖一切风险 / 绝对安全” 的承诺 |

## 了解更多

- [文档站](https://promptbeat.mintlify.app)  
- [使用指南](docs/usage-guide.md)  
- [场景驱动评测](website/getting-started/scenario-driven-evaluation.mdx)  
- [Agent 靶标](website/targets/agent-targets.mdx)  
- [数据集目录](website/datasets/catalog.mdx)  
- [Releases](https://github.com/tophant-ai/aibeat/releases)  

---

<div align="center">
  <sub>
    AI Beat 系列 · PromptBeat 发现风险 · AgentBeat 证明步骤 ·
    持续复测让每次 AI 更新重新接受安全测试
  </sub>
</div>
