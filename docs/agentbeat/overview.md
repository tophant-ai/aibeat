# AgentBeat Overview

AgentBeat is the external black-box Agent evaluation boundary. `agentbeat eval-run` directly calls the Go `RunAgentEvaluation` application path from its own native binary. It does not spawn PromptBeat or invoke Promptfoo. Companion commands are `agentbeat preflight` and `agentbeat score`; legacy `run --adapter` is separate and still requires its original dependencies.

## Contract facts

| Fact | Current contract |
| --- | --- |
| Request unit | One `domain.AgentCase` per `eval-run` request. |
| Connector | `agentconnectors.BusinessHTTP` is the declarative execution connector. |
| Evidence path | L2 trace/evidence uses `GET /v1/evidence/{run_id}` when trace evidence is declared. |
| Scoring | The current product profile is `0.7` deterministic / `0.3` LLM judge. The API receives a request-scoped `ScoringProfile` and validates positive weights summing to 1, so these values are not hard-wired universal constants. |
| L3 hard gate | The native state verifier owns L3. A verified security failure or attack success cannot be overturned by the judge. |

## Current code path

| Layer | File | Responsibility |
| --- | --- | --- |
| CLI boundary | `core/go/cmd/agentbeat/api_agent_run.go` | JSON request/response boundary, target registry lookup, connector wiring, state controller hookup |
| Execution core | `core/go/internal/application/run_agent_evaluation.go` | Negotiate the target, build the execution plan, invoke the target, collect evidence, score, and return the result |
| Deterministic scorer | `core/go/internal/application/tier_evidence_rule_scorer.go` | Mechanical L1/L2 evidence scoring |
| LLM judge | `core/go/internal/application/agent_llm_judge.go` | Judge scorer component, not the native oracle |
| Native oracle projection | `core/go/internal/application/native_evidence_scorer.go` | L3 state-verifier projection |
| Shared types | `core/go/internal/domain/agent_evaluation.go` | Observation tiers, evidence, scores, metrics |

## Observation tiers

| Tier | Observed facts | Boundary |
| --- | --- | --- |
| L1 | Final response only | Black-box answer boundary |
| L2 | Final response plus trace/evidence | Runtime evidence boundary |
| L3 | Environment before/after state plus verification | Environment-side native oracle boundary |

The state controller is an environment-side HTTP or fixture contract. It is not the Agent protocol. `seed`, `reset`, `snapshot`, and `verify` belong to the environment controller path, not to the Agent itself.

## Scoring

- The current product profile uses `0.7` deterministic plus `0.3` LLM judge. Code validates explicit request weights rather than embedding those values as universal constants.
- L3 requires a registered state controller.
- The native oracle remains authoritative on L3. The judge can inform the score, but it does not override the environment verifier.

## Evidence and failure handling

- L2/L3 evidence is only collected when the adapter exposes it.
- Request-scoped credentials are rejected for L3.
- If the target cannot be executed, `RunAgentEvaluation` returns an unavailable error instead of fabricating a result.

## What not to infer

- `Inspect` and promptfoo are not the Agent runtime here.
- `cmd/agentbeat` owns the CLI boundary; `internal/application` retains scoring and orchestration. In v0.4.0+, former `promptbeat api` Agent commands exit with migration guidance instead of executing.
- `eval-run` evaluates one existing `AgentCase`; attack-case generation belongs to the separate PromptBeat product.
