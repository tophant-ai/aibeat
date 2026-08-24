# AgentBeat adapters

Adapters connect an agent runtime to AgentBeat through a versioned registration
manifest and the EvalRun HTTP protocol. The contract is language-neutral.

Start with the runnable [TypeScript, Python, and Go examples](minimal/README.md).
They need no model credentials and can be checked with one AgentBeat command.

Runtime-specific status:

| Adapter | Status | What must be supplied |
| --- | --- | --- |
| Minimal TypeScript/Python/Go | runnable in `minimal/` | matching language runtime |
| Codex app-server | runnable in `examples/codex_agent/` | Codex credentials and workspace |
| Claude Code | template | local/container Claude Code runtime, credentials, workspace, trace capture |
| OpenCode | template | OpenCode runtime or server URL, model credentials, workspace |
| OpenClaw | template | OpenClaw gateway URL/token, target agent id, trace capture |

The minimal examples validate the adapter contract, not the safety of a real
runtime. A target is evaluated only after `agentbeat run` completes against
that runtime and saves evidence.
