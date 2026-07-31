<div align="center">
  <p>
    <img src="docs/assets/promptbeat-logo.svg" alt="PromptBeat logo" height="72" />
    &nbsp;&nbsp;
    <img src="docs/assets/agentbeat-logo.svg" alt="AgentBeat logo" height="72" />
  </p>

  <h1>AI Beat · PromptBeat 与 AgentBeat</h1>

  <p><strong>从 Prompt 红队，到 Agent 行为取证。</strong></p>
  <p>面向大模型、RAG 应用与真实 Agent 运行时的场景驱动安全评测闭环。</p>
  <p><a href="README.md"><strong>English</strong></a></p>

  <p>
    <a href="https://github.com/tophant-ai/promptbeat/stargazers"><img alt="GitHub stars" src="https://img.shields.io/github/stars/tophant-ai/promptbeat?style=flat&logo=github&label=Stars" /></a>
    <img alt="Version" src="https://img.shields.io/badge/version-0.1.0-2dd288" />
    <img alt="AI Red Teaming" src="https://img.shields.io/badge/AI-Red%20Teaming-7c3aed" />
    <img alt="LLM + Agent" src="https://img.shields.io/badge/targets-LLM%20%2B%20Agent-2088FF" />
    <img alt="Evidence-first" src="https://img.shields.io/badge/evidence-answer%20%2B%20trace-111111" />
  </p>

  <p>
    <a href="#为什么需要-ai-beat"><strong>为什么需要</strong></a>
    · <a href="#promptbeat-与-agentbeat"><strong>双产品</strong></a>
    · <a href="#快速开始"><strong>快速开始</strong></a>
    · <a href="https://github.com/tophant-ai/promptbeat/releases"><strong>Releases</strong></a>
    · <a href="examples/"><strong>示例</strong></a>
    · <a href="website/"><strong>文档</strong></a>
  </p>

  <br />
  <img src="demo/recordings/videos/hero.gif" alt="PromptBeat 红队评测实时 TUI" width="960" />
</div>

---

别再把 AI 安全测试当成一次性项目。

**PromptBeat** 持续发现并优化攻击用例。  
**AgentBeat** 在真实运行中验证 Agent 是否越界——看的不只是最终回答，还有工具调用、文件操作与环境变化。

```text
PromptBeat：发现风险
    → AgentBeat：验证真实行为
    → Finding 与回归数据回流，持续复测
```

> AI Beat 用于 **上线前安全验收、持续回归、证据化 Finding 与红队数据资产沉淀**。  
> **不替代** 运行时防护网关 / WAF。

## 证据化报告

报告不只给分数：总览指标、模型对比、Case 下钻，以及运行时 Trace，方便复现和复测。

### 报告总览

<p align="center">
  <img src="docs/assets/screenshots/readme-report-promptbeat.png" alt="PromptBeat 评测报告总览：PASS/FAIL 与模型表现" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-report-agentbeat.png" alt="AgentBeat 运行时评测报告（Coding Agent 靶标）" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-report-cycle.png" alt="PromptBeat 数据集构建循环报告：保留 / 改写 / 淘汰" width="960" />
</p>

### Case Explorer 与证据详情

从全局结论下钻到每一条执行结果：状态、风险、目标/模型，再打开 Case 详情查看期望 vs 实际、Judge 依据与 Agent Trace。

<p align="center">
  <img src="docs/assets/screenshots/readme-case-explorer-promptbeat.png" alt="PromptBeat Case Explorer（筛选 FAIL）" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-explorer-agentbeat.png" alt="AgentBeat Case Explorer 用例列表" width="960" />
</p>

<p align="center">
  <img src="docs/assets/screenshots/readme-case-detail-agentbeat.png" alt="AgentBeat Case 详情：期望与实际、Judge 判定、Agent Trace" width="960" />
</p>

| 截图 | 展示内容 |
| --- | --- |
| PromptBeat 评测 | 多模型安全评测总览 — PASS / FAIL / REVIEW 与 ASR 类指标 |
| AgentBeat 评测 | 真实 Agent 运行时报告（Codex app-server），面向 trace 证据 |
| 数据集构建循环 | Promote / Rewrite / Reject，沉淀可回归基线 |
| Case Explorer | Case 级列表：状态、风险、模型与证据入口 |
| Case 详情 | 期望 vs 实际、Judge 策略，以及 FAIL 案例的 Agent Trace |

演示源文件：`demo/reports/demo-agent-showcase.html`、`demo/reports/demo-codex-agent.html`、`demo/reports/cycle-report.html`。

## 为什么需要 AI Beat

常见做法往往卡在这里：

| 常见做法 | 真正卡点 |
| --- | --- |
| 一次性人工红队 | 难规模化、难复现，模型/提示词升级后还要重来 |
| 固定安全题库 | 覆盖有限，难跟上新的攻击表达 |
| 只看单次分数 | 没有可版本化的长期基线 |
| 只判回答文本 | Agent 可能“说得安全”，却已通过工具/文件造成副作用 |

AI Beat 把安全测试变成工程闭环：

```text
风险场景 + 种子/数据集 + 攻击策略
  → 真实目标执行
  → Judge + 证据
  → 保留 / 改写 / 淘汰
  → 版本化回归基线
```

**一句话：把 AI 安全测试从“项目动作”变成“可持续工程能力”。**

## PromptBeat 与 AgentBeat

两款产品覆盖从 Prompt 到 Agent 的安全测试：

| | **PromptBeat** | **AgentBeat** |
| --- | --- | --- |
| 一句话 | **出题 + 初判**：生成、执行、打分、沉淀测试集 | **深测 + 取证**：进入运行时，定位越界步骤 |
| 适合 | 模型、RAG、简单 Agent、多模型对比 | 工具型 / Coding / 工作流 Agent |
| 用户真正想知道 | 有没有风险？怎么快速构造可回归测试集？ | 有没有真的越权、误调工具、泄数据？在哪一步？ |
| 主要证据 | 攻击用例、模型输出、风险分、Finding | 工具调用、命令轨迹、文件/环境 diff、副作用 |
| 典型产出 | 红队测试集、ASR/覆盖、黄金数据集 | 运行时证据链、可复现攻击路径、修复复测包 |

### PromptBeat：自动生成、执行并持续更新攻击用例

PromptBeat 是 **测试生成与评测层**：

1. **场景驱动风险建模** — 明确测谁、测什么风险、什么算失败  
2. **导入测试素材** — 公开数据集、企业题库或订阅包  
3. **生成与改写攻击用例** — 场景化变体、策略组合、编码变换  
4. **真实目标执行** — LLM API、HTTP Agent、Coding Agent、Adapter  
5. **标准化 Judge** — PASS / FAIL / REVIEW 与严重度  
6. **持续更新用例** — Promote / Rewrite / Reject，形成版本化基线  

**PromptBeat 能做什么**

- 模型 / RAG / 业务 Agent 上线前安全验收  
- 同一攻击集、同一 Judge 标准下的多模型横向对比  
- 从固定题库升级为可迭代的安全数据资产  
- 通过数据集订阅接入 HarmBench、JailbreakBench、JADE-DB、SALAD-Bench 等（需本地原始数据时配置数据目录）  
- 保留 seed → case → finding → report 的完整血缘  

### AgentBeat：沿执行过程找到越界的那一步

“回答安全”仍可能失败：

```text
任务：为故障排查生成支持包
回答：聊天里没有密钥  → 看似通过
过程：执行了 env | sort > env_dump.txt
环境：敏感信息被写入文件  → 失败
```

AgentBeat 是 **运行时观测与取证层**：

1. 接入被测 Agent（SDK / HTTP / Adapter）  
2. 按场景定义任务要求与禁止边界  
3. 记录 **回答 + 执行过程 + 环境变化**  
4. 定位触发越权 / 泄露 / 审批绕过的步骤  
5. 输出风险报告，沉淀修复复测用例  

**选型建议**

- 把 Agent 当黑盒、先要覆盖面与测试集 → 用 **PromptBeat**  
- 需要证明工具、权限、记忆、环境副作用 → 用 **AgentBeat**  
- 最佳闭环：**PromptBeat 发现风险 → AgentBeat 验证行为 → 结果回流持续复测**

## 产品边界（建立可信度）

| AI Beat 是 | AI Beat 不是 |
| --- | --- |
| 在真实目标上自动评测 | 线上实时拦截的网关 / WAF |
| 证据化 Finding + 回归数据 | 单纯的攻击 Prompt 库 |
| 对人工红队的工程化补充 | 对高风险 Finding 专家复核的完全替代 |
| PromptBeat（出题）+ AgentBeat（取证） | “覆盖一切风险 / 绝对安全” 的承诺 |

## 快速开始

下载并解压对应平台的二进制发布包，在发布包根目录执行：

```bash
./bin/promptbeat --version
```

配置基础 LLM 示例所需的 Provider 角色：

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
# 校验 → 生成 → 评测 → 报告
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

源码方式运行：

```bash
cd core/go
go run ./cmd/promptbeat -- --version
```

## 从示例开始

选最接近被测系统的示例，复制后替换 Target、Provider 与场景参数。

| 示例 | 适用场景 |
| --- | --- |
| `examples/bootstrap/` | 最小端到端路径 |
| `examples/llm-basic/` | 单模型安全评测 |
| `examples/multi-llm/` | 多模型 / 多 Provider 对比 |
| `examples/dataset-subscriptions/safety-baseline/` | 从数据集订阅启动 |
| `examples/http-agent/` | HTTP 暴露的业务 Agent |
| `examples/codex_agent/` | Coding Agent / 运行时轨迹评测 |
| `examples/agent-adapters/` | 自定义 Agent Runtime 适配 |
| `examples/china-compliance/` | 风险分类与中国合规场景 |
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

大型原始 benchmark 默认不随示例内置。需要时指定本地数据根目录：

```bash
export PROMPTBEAT_DATASETS_DIR=/path/to/promptbeat/datasets/raw
```

## 支持的目标形态

- 标准 LLM Provider  
- 通过 HTTP 暴露的业务 Agent  
- Codex SDK 与 coding-agent runtime  
- 经 Adapter 接入的 Claude Code、OpenCode、OpenClaw 或内部系统  
- 受控 Target Lab / Inspect 类环境  

Adapter 应返回最终回答；在可用时还应输出 **trace 证据**：命令、工具调用、文件变化、网络事件、策略拒绝等。

## 核心概念

| 概念 | 说明 |
| --- | --- |
| **Target** | 被测模型、应用或 Agent |
| **Scenario** | 风险目标、成败边界、分类映射与 Judge 策略 |
| **Seed** | 生成前的初始攻击素材 |
| **Subscription** | 可复用的数据集 / 种子来源订阅 |
| **Attack Recipe** | 可重复的攻击策略或变换 |
| **Provider / Adapter** | LLM、HTTP、CLI 或 Agent Runtime 的执行接入契约 |

## Skills（降低使用门槛）

在 AI 编程助手中用自然语言驱动常见流程：

| Skill | 作用 |
| --- | --- |
| `promptbeat-getting-started` | 理解需求，进入正确评测路径 |
| `promptbeat-select-risk-pack` | 选择风险场景、种子与策略 |
| `promptbeat-run-quick-eval` | 运行小规模评测并定位产物 |
| `promptbeat-connect-coding-agent` | 连接被测 Coding Agent |
| `promptbeat-debug-run` | 诊断常见配置与运行问题 |

详见 `promptbeat-skills/`。

## 仓库地图

本仓库以 **产品说明 + 可运行示例** 为主（日常使用推荐二进制分发）：

| 路径 | 说明 |
| --- | --- |
| `core/go/` | PromptBeat CLI 核心 |
| `examples/` | LLM / Agent / 合规等可运行示例 |
| `subscriptions/` | 数据集订阅配置 |
| `promptbeat-skills/` | 助手 Skill |
| `docs/` | 设计说明、宣传口径与方法论 |
| `website/` | 文档站点源码 |
| `api/` | 生成能力相关 Web/API 服务 |

## 了解更多

- [使用指南](docs/usage-guide.md)  
- [场景驱动评测](website/getting-started/scenario-driven-evaluation.mdx)  
- [Agent 靶标](website/targets/agent-targets.mdx)  
- [数据集目录](website/datasets/catalog.mdx)  
- [Releases](https://github.com/tophant-ai/promptbeat/releases)  

---

<div align="center">
  <sub>AI Beat 系列 · PromptBeat 看是否出现风险 · AgentBeat 看哪一步越界 · 持续复测让每次 AI 更新重新接受安全测试</sub>
</div>
