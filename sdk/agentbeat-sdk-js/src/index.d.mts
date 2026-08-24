import type { Server } from "node:http";

export type RuntimeEvent = {
  event_type: string;
  source?: string;
  timestamp_ms?: number;
  [key: string]: unknown;
};

export type AdapterRunInput = {
  prompt: string;
  runtime: Record<string, unknown>;
  runID?: string;
  vars: Record<string, unknown>;
};

export type AdapterTurnOutput =
  | RuntimeEvent[]
  | {
      runtimeEvents: RuntimeEvent[];
      status?: "completed" | "failed";
      source?: string;
      trace?: Record<string, unknown>;
    };

export type AdapterManifest = Readonly<{
  schema_version: "agentbeat.adapter.v1";
  id: string;
  version: string;
  protocol_version: string;
  target: string;
  capabilities: readonly string[];
}>;

export type EvalServerOptions = {
  token?: string;
  tokenEnvVar?: string;
};

export type AdapterDefinition = {
  id: string;
  version: string;
  capabilities?: string[];
  protocolVersion?: string;
  target?: string;
  defaultSource?: string;
  runTurn(input: AdapterRunInput): AdapterTurnOutput | Promise<AdapterTurnOutput>;
};

export type AdapterRegistration = Readonly<{
  manifest: AdapterManifest;
  createEvalServer(options?: EvalServerOptions): Server;
}>;

export const ADAPTER_SCHEMA_VERSION: "agentbeat.adapter.v1";
export const EVAL_PROTOCOL_VERSION: "agentbeat.eval.v1";
export function defineAdapter(definition: AdapterDefinition): AdapterRegistration;

export type CreateEvalServerOptions = EvalServerOptions & {
  adapterName?: string;
  defaultSource?: string;
  protocolVersion?: string;
  target?: string;
  registration?: AdapterManifest;
  runTurn(input: AdapterRunInput): AdapterTurnOutput | Promise<AdapterTurnOutput>;
};

export function createEvalServer(options: CreateEvalServerOptions): Server;

export function buildTraceEvents(
  events: RuntimeEvent[],
  runID: string,
  options?: { defaultSource?: string },
): Array<Record<string, unknown>>;
export function collectFinalAnswer(events: RuntimeEvent[]): string;
export function describeError(error: unknown): string;
export function parseJsonLines(
  chunk: string,
  previousRemainder?: string,
): { records: unknown[]; remainder: string };

export function buildJudgeObservation(options: Record<string, unknown>): Record<string, unknown>;
export function incrementCount(counts: Record<string, number>, value: string): void;
export function sanitizeJudgeVars(vars: Record<string, unknown>): Record<string, unknown>;
export function summarizeTraceEvents(events: RuntimeEvent[]): Record<string, unknown>;

export function buildArtifactManifest(
  runID: string,
  traceEvents: RuntimeEvent[],
  runtimeEvents: RuntimeEvent[],
  options?: Record<string, unknown>,
): Record<string, unknown>;
export function buildEvalRun(
  runID: string,
  status: string,
  metrics?: Record<string, unknown>,
  options?: Record<string, unknown>,
): Record<string, unknown>;
export function buildEvalRunLinks(runID: string): Record<string, string>;

export class TraceCollector {
  constructor(runId: string, options?: { source?: string });
  recordToolCall(name: string, args?: Record<string, unknown>): RuntimeEvent;
  recordToolResult(name: string, result: unknown): RuntimeEvent;
  recordFileDiff(path: string, diff: string): RuntimeEvent;
  recordEnvChange(before: unknown, after: unknown): RuntimeEvent;
  recordError(error: unknown): RuntimeEvent;
  toRuntimeEvents(): RuntimeEvent[];
  toTraceEvents(): Array<Record<string, unknown>>;
  buildObservation(answer: string, vars?: Record<string, unknown>): Record<string, unknown>;
}
