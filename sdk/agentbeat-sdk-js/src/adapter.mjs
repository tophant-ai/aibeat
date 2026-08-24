import { createEvalServer as createServer } from "./server.mjs";

export const ADAPTER_SCHEMA_VERSION = "agentbeat.adapter.v1";
export const EVAL_PROTOCOL_VERSION = "agentbeat.eval.v1";

const ADAPTER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

export function defineAdapter(rawDefinition) {
  if (!rawDefinition || typeof rawDefinition !== "object" || Array.isArray(rawDefinition)) {
    throw new Error("defineAdapter requires a definition object");
  }

  const id = requiredString(rawDefinition.id, "definition.id");
  if (!ADAPTER_ID_PATTERN.test(id)) {
    throw new Error("definition.id must not contain whitespace or unsupported characters");
  }
  const version = requiredString(rawDefinition.version, "definition.version");
  if (typeof rawDefinition.runTurn !== "function") {
    throw new Error("definition.runTurn(input) must be a function");
  }

  const capabilities = normalizeCapabilities(rawDefinition.capabilities);
  const protocolVersion =
    optionalString(rawDefinition.protocolVersion, "definition.protocolVersion") ||
    EVAL_PROTOCOL_VERSION;
  const target = optionalString(rawDefinition.target, "definition.target") || id;
  const manifest = Object.freeze({
    schema_version: ADAPTER_SCHEMA_VERSION,
    id,
    version,
    protocol_version: protocolVersion,
    target,
    capabilities: Object.freeze(capabilities),
  });

  const registration = {
    manifest,
    createEvalServer(rawOptions = {}) {
      if (!rawOptions || typeof rawOptions !== "object" || Array.isArray(rawOptions)) {
        throw new Error("createEvalServer options must be an object");
      }
      return createServer({
        ...rawOptions,
        adapterName: id,
        defaultSource: rawDefinition.defaultSource || id,
        protocolVersion,
        target,
        registration: manifest,
        runTurn: rawDefinition.runTurn,
      });
    },
  };
  return Object.freeze(registration);
}

function requiredString(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} must be a non-empty string`);
  }
  return value.trim();
}

function optionalString(value, name) {
  if (value === undefined) {
    return "";
  }
  return requiredString(value, name);
}

function normalizeCapabilities(value) {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error("definition.capabilities must be an array of strings");
  }
  const capabilities = value.map((entry) =>
    requiredString(entry, "definition.capabilities entry"),
  );
  if (new Set(capabilities).size !== capabilities.length) {
    throw new Error("definition.capabilities must not contain duplicates");
  }
  return capabilities;
}
