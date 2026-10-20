> [!note]
> 产品边界：PromptBeat 与 AgentBeat 都是可独立使用的开源产品。
> 本文如涉及 promptfoo，相关内容只适用于 PromptBeat 的 Prompt 红队与评测链路。
> 不要据此设计 AgentBeat 的 `RunAgentEvaluation`、L1/L2/L3 证据或运行时。

# PromptBeat Overview

PromptBeat is an open-source Prompt red-team and evaluation product. It owns seed expansion, dataset building, promptfoo config compilation, evaluation orchestration, and report generation. It is independent from the open-source AgentBeat product.

## Entrypoints

| Layer | File | Responsibility |
| --- | --- | --- |
| CLI router | `core/go/cmd/promptbeat/main.go` | Dispatches `api`, `generate`, `eval`, `dataset`, `seed`, `report`, `validate`, and related commands |
| API eval boundary | `core/go/cmd/promptbeat/api_agent_run.go` | Binary entrypoint for the agentbeat product boundary while the CLI split is still pending |
| Promptfoo backend | `core/go/internal/backends/promptfoo/` | Compiles promptfoo configs, runs promptfoo, and parses results |
| Dataset build cycle | `core/go/internal/application/dataset_version.go` | Builds dataset versions and promotion/rewrite outputs |
| Pipeline orchestration | `core/go/internal/application/run_evaluation.go` | Runs promptbeat evaluation and report generation |

## Boundary

- PromptBeat owns its product semantics, seed models, risk mapping, and dataset lifecycle.
- Promptfoo is PromptBeat's current backend binding for Prompt red-team and evaluation work; it is not AgentBeat's runtime.
- PromptBeat documentation can describe promptfoo as an implementation dependency, but it must not present promptfoo as the AgentBeat execution core.

## Agentbeat entrypoint

- `promptbeat api eval-run` is the current binary entrypoint for the agentbeat product boundary.
- The command name stays `promptbeat` until the CLI split lands.
- `core/go/cmd/agentbeat` is outside this product boundary and remains a legacy adapter shell.

## Read next

- [agentbeat/overview.md](../agentbeat/overview.md)
- [agentbeat/code-map.md](../agentbeat/code-map.md)
- `dataset-construction-evaluation-overview.md`
