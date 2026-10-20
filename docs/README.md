# Documentation Index

唯一文档树。`docs/` 根下只留本索引；正文按子目录分放。旧的仓库根 `doc/` 已取消。

## Read first

1. [AgentBeat overview](agentbeat/overview.md)
2. [PromptBeat overview](promptbeat/overview.md)
3. [AgentBeat code map](agentbeat/code-map.md)

## Current product boundaries

| Product | Delivery | Evaluated target | Current runtime |
| --- | --- | --- | --- |
| **agentbeat** | Open-source package | Customer HTTP Agent | Go `RunAgentEvaluation`; no promptfoo in the runtime |
| **promptbeat** | Open-source package | Model / Prompt | promptfoo execution and YAML mapping |

AgentBeat consumes an existing `AgentCase`; it does not generate attack cases in this execution path. Its evidence levels are L1 final response, L2 trace/evidence, and L3 environment-side native oracle. The L3 controller is not an Agent implementation protocol.

## Directory map

Paths shown as plain code (not links), including `core/`, live in the private maintenance repository and are not part of this public repo.

| Path | Contents |
| --- | --- |
| [agentbeat/](agentbeat/) | Agent 评测产品边界与代码地图 |
| [promptbeat/](promptbeat/) | Prompt 红队 / promptfoo 产品边界 |
| `datasets/` | 数据集与 seed 相关计划、矩阵、验收 |
| `design/` | 设计稿、接口方案、能力对齐（含历史种子设计） |
| `ops/` | 部署、发布、用法、运维与密钥生命周期说明 |
| `eval-integration/` | 评测接入、真实 agent onboarding / 靶场集成 |
| `_archive/` | 已退役提案与草稿（只作历史） |

## How to route a question

- Current black-box Agent evaluation: [agentbeat/overview.md](agentbeat/overview.md)
- Prompt red-team, promptfoo, seed expansion, datasets: [promptbeat/overview.md](promptbeat/overview.md) and `datasets/`
- Mixed code layout / migration boundaries: [agentbeat/code-map.md](agentbeat/code-map.md)
- Real agent target integration: `eval-integration/real-agent-target-integration.md`
- Deploy / release / usage: `ops/`
- Historical notes: `_archive/`

## Notes

- `promptbeat api eval-run` is the current command path for Agent evaluation in this tree.
- `core/go/cmd/agentbeat` is a legacy adapter shell.
- Benchmark dataset plan: `datasets/benchmark-datasets-plan-v1.9.md`.
