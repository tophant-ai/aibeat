// Codex app-server JSON-RPC notification adapter. It contains no transport,
// model, workspace, MCP, EvalRun, or scoring logic.
export function normalizeCodexNotification(message, occurredAt = new Date().toISOString()) {
  const method = message?.method;
  const params = message?.params || {};
  const item = params.item || {};
  const common = { occurredAt, source: "codex-app-server" };

  if (method === "thread/started") {
    return { ...common, type: "lifecycle", data: { name: "thread.started", attributes: { thread_id: params.thread?.id || null } } };
  }
  if (method === "turn/started") {
    return { ...common, type: "lifecycle", data: { name: "turn.started", attributes: { turn_id: params.turn?.id || null } } };
  }
  if (method === "item/agentMessage/delta") {
    return { ...common, type: "message.delta", data: { role: "assistant", delta: params.delta || "", attributes: { item_id: params.itemId || null } } };
  }
  if (method === "item/started" && ["mcpToolCall", "dynamicToolCall"].includes(item.type)) {
    return { ...common, type: "tool.call", data: { call_id: item.id, name: item.tool, arguments: item.arguments ?? item.parameters ?? {}, attributes: { item_type: item.type } } };
  }
  if (method === "item/completed" && ["mcpToolCall", "dynamicToolCall"].includes(item.type)) {
    return { ...common, type: "tool.result", data: { call_id: item.id, name: item.tool, result: item.result ?? item.contentItems ?? null, is_error: Boolean(item.error) || ["failed", "error"].includes(item.status), status: item.status, error: item.error, attributes: { item_type: item.type } } };
  }
  if (method === "item/completed" && item.type === "commandExecution") {
    return { ...common, type: "command.result", data: { command: item.command || "unknown", exit_code: Number.isSafeInteger(item.exitCode) ? item.exitCode : -1, output: item.aggregatedOutput || "", status: item.status, attributes: { item_id: item.id || null } } };
  }
  if (method === "item/completed" && item.type === "fileChange") {
    const changes = Array.isArray(item.changes) ? item.changes : [];
    return { ...common, type: "file.change", data: { path: item.path || changes[0]?.path || "workspace", changes, status: item.status, attributes: { item_id: item.id || null } } };
  }
  if (method === "item/completed" && item.type === "agentMessage") {
    return { ...common, type: "message", data: { role: "assistant", text: item.text || "", attributes: { item_id: item.id || null } } };
  }
  if (method === "turn/completed") {
    return { ...common, type: "lifecycle", data: { name: "turn.completed", status: params.turn?.status, attributes: { turn_id: params.turn?.id || null } } };
  }
  if (method === "error") {
    return { ...common, type: "run.error", data: { message: String(params.message || params.error || "Codex runtime error"), attributes: {} } };
  }
  return null;
}

export function observeCodexNotification(message, observe, occurredAt) {
  if (!observe || typeof observe.event !== "function") throw new TypeError("an EvidenceCollector is required");
  const normalized = normalizeCodexNotification(message, occurredAt);
  return normalized ? observe.event(normalized) : null;
}
