// Public AgentBeat collection SDK.
//
// This package owns only Agent-side observation collection. The AI Beat Go
// Core owns Target invocation, EvalRun lifecycle, state verification, Judge
// calls, and score aggregation.

export {
  BoundedEvidenceStore,
  EvidenceCollector,
  buildTargetEvidence,
} from "./evidence.mjs";
