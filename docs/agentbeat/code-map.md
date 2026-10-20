# AgentBeat Code Map

This map records the current layout only. It does not freeze the final package names.

## Current mix

| Path | Current role | Notes |
| --- | --- | --- |
| `core/go/internal/application/run_agent_evaluation.go` | Agent evaluation orchestrator | Negotiates the target, builds the execution plan, runs the connector, collects evidence, and aggregates scoring |
| `core/go/cmd/agentbeat/api_agent_run.go` | Native CLI boundary for `agentbeat eval-run` | Resolves the target registry and deployment binding, wires connectors and controllers, then calls `RunAgentEvaluation` |
| `core/go/internal/application/agent_evaluation_contract.go` | Scoring contract and cascade | Validates scoring profiles and aggregates deterministic and judge components |
| `core/go/internal/application/tier_evidence_rule_scorer.go` | Deterministic L1/L2 scorer | Mechanical evidence only |
| `core/go/internal/application/native_evidence_scorer.go` | L3 native oracle projection | Environment-state verifier projection |
| `core/go/internal/application/agent_llm_judge.go` | LLM judge scorer | Scorer component, not the native oracle |
| `core/go/internal/domain/agent_evaluation.go` | Shared domain model | Observation tiers, evidence, scores, metrics, and result envelopes |
| `core/go/internal/agentconnectors` | Connector abstractions | Business HTTP, header auth, evidence collectors |
| `core/go/internal/targetregistry` | Deployment registry | Target profile and deployment binding for eval-run |
| `core/go/internal/backends/promptfoo` | PromptBeat backend binding | promptfoo compile, run, and result parsing |
| `core/go/internal/application/dataset_version.go` | Dataset build cycle | PromptBeat red-team dataset construction |
| `core/go/cmd/agentbeat/main.go` | AgentBeat CLI router | Native `eval-run`, `preflight`, `score`; legacy `run --adapter` is separate |
| `core/go/cmd/promptbeat/main.go` | PromptBeat CLI router | Current prompt/promptfoo command surface |

## What this map is for

- It helps the eventual split by product boundary.
- It is not the place to rename packages.
- It is not a promise that every file in `core/go/internal/application` will stay there.
