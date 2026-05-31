# Agent adapter templates

These files are target-provider templates for coding agents that are not yet packaged as first-class Promptbeat providers in this repository.
They are intentionally separated from scenarios and seeds so the same generated cases can be re-evaluated against different agent applications.

Current status:

| Adapter | Status | What must be supplied |
| --- | --- | --- |
| Codex SDK | runnable in `examples/codex_agent/` | Codex credentials and workspace |
| Claude Code | template | local/container Claude Code runtime, credentials, workspace, trace capture |
| OpenCode | template | OpenCode runtime or server URL, model credentials, workspace |
| OpenClaw | template | OpenClaw gateway URL/token, target agent id, trace capture |

Do not treat these templates as validation evidence by themselves. A target is validated only after `promptbeat generate` and `promptbeat eval` run against a real runtime and save artifacts.
