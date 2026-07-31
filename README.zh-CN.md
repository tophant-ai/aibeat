<div align="center">
  <p>
    <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat logo" height="72" />
    &nbsp;&nbsp;
    <img src="docs/assets/agentbeat-logo.svg" alt="AgentBeat logo" height="72" />
  </p>

  <h1>AI Beat</h1>

  <p><strong>从 Prompt 红队，到 Agent 行为取证。</strong></p>
  <p>面向大模型、RAG 应用与真实 Agent 运行时的场景驱动安全评测。</p>

  <p>
    <a href="README.md">English</a>
    ·
    <a href="https://github.com/tophant-ai/aibeat/releases">Releases</a>
    ·
    <a href="examples/">示例</a>
    ·
    <a href="https://promptbeat.mintlify.app">文档</a>
  </p>

  <p>
    <a href="https://github.com/tophant-ai/aibeat/stargazers"><img alt="Stars" src="https://img.shields.io/github/stars/tophant-ai/aibeat?style=flat&logo=github" /></a>
    <a href="https://github.com/tophant-ai/aibeat/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/tophant-ai/aibeat?style=flat&color=2dd288" /></a>
    <img alt="LLM + Agent" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" />
  </p>
</div>

<br />

<p align="center">
  <img src="demo/recordings/videos/hero.gif" alt="PromptBeat 评测 TUI" width="900" />
</p>

## 它做什么

把 AI 安全测试做成可重复的工程闭环：

```text
风险场景 + 种子 + 攻击策略
  → 真实目标执行
  → Judge + 证据
  → 保留 / 改写 / 淘汰
  → 回归基线
```

| 产品 | 角色 |
| --- | --- |
| **PromptBeat** | 发现风险 — 生成、执行、打分、沉淀测试集 |
| **AgentBeat** | 证明步骤 — 记录工具、文件、环境变化与 Trace |

要覆盖面和可回归测试集 → PromptBeat。  
要证明“哪一步越界” → AgentBeat。

> 用于上线前验收、持续回归、证据化 Finding。  
> **不替代** 运行时网关 / WAF。

## 能力要点

- **场景驱动** — 风险目标、成败边界、Judge，而不是孤立 Prompt
- **真实靶标** — LLM API、HTTP Agent、Coding Agent、Adapter
- **证据优先** — 回答、工具调用、文件/环境 diff、Case 下钻
- **活的数据集** — 保留高价值、改写近似、淘汰噪声
- **可对比** — 同一攻击集、同一 Judge 做多模型对比

<p align="center">
  <img src="docs/assets/screenshots/readme-report-promptbeat.png" alt="评测报告总览" width="900" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-detail-agentbeat.png" alt="Case 详情：Judge 与 Agent Trace" width="900" />
</p>

## 快速开始

```bash
# 1) 下载并解压 release 后：
./bin/promptbeat --version

# 2) 配置基础示例的 Provider
export ATTACKER_MODEL_NAME="openai:gpt-4o"
export ATTACKER_BASE_URL="https://api.openai.com/v1"
export ATTACKER_API_KEY="sk-..."

export JUDGE_MODEL_NAME="openai:gpt-4o"
export JUDGE_BASE_URL="https://api.openai.com/v1"
export JUDGE_API_KEY="sk-..."

export TARGET_MODEL_NAME="openai:gpt-4o-mini"
export TARGET_BASE_URL="https://api.openai.com/v1"
export TARGET_API_KEY="sk-..."

# 3) 校验 → 生成 → 评测 → 报告
./bin/promptbeat validate --config examples/llm-basic/promptbeat.yaml
./bin/promptbeat generate --config examples/llm-basic/promptbeat.yaml --output artifacts/llm-basic/cases.json
./bin/promptbeat eval --config artifacts/llm-basic/promptfoo.redteam.yaml --output-dir artifacts/llm-basic/eval
./bin/promptbeat report --input artifacts/llm-basic/eval/evaluation_result.json --output artifacts/llm-basic/report.html
```

## 示例

| 路径 | 适用 |
| --- | --- |
| `examples/llm-basic/` | 单模型安全评测 |
| `examples/multi-llm/` | 多模型对比 |
| `examples/http-agent/` | HTTP 业务 Agent |
| `examples/codex_agent/` | Coding Agent / 运行时轨迹 |
| `examples/dataset-subscriptions/safety-baseline/` | 数据集订阅流程 |
| `examples/china-compliance/` | 合规相关场景 |

## 靶标

LLM Provider · HTTP Agent · Codex / coding-agent · 经 Adapter 的 Claude Code / OpenCode / OpenClaw · Target Lab / Inspect 类环境

Adapter 应返回最终回答；可用时附带 **trace 证据**（命令、工具、文件、网络、策略拒绝）。

## Skills

`promptbeat-skills/` 下的自然语言入口：

`getting-started` · `select-risk-pack` · `run-quick-eval` · `connect-coding-agent` · `debug-run`

## 了解更多

- [文档站](https://promptbeat.mintlify.app)
- [使用指南](docs/usage-guide.md)
- [Releases](https://github.com/tophant-ai/aibeat/releases)
- [示例](examples/)

---

<div align="center">
  <sub>PromptBeat 发现风险 · AgentBeat 证明步骤 · 持续复测让每次 AI 更新重新接受安全测试</sub>
</div>
