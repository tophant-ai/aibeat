# Minimal AgentBeat adapters

AgentBeat adapters register through the language-neutral
`agentbeat.adapter.v1` manifest and expose the `agentbeat.eval.v1` HTTP
protocol. The process language is not part of the contract.

Choose one implementation and run its protocol check:

```bash
agentbeat adapter check \
  --adapter examples/agent-adapters/minimal/typescript/agentbeat-adapter.json
```

```bash
agentbeat adapter check \
  --adapter examples/agent-adapters/minimal/python/agentbeat-adapter.json
```

```bash
agentbeat adapter check \
  --adapter examples/agent-adapters/minimal/go/agentbeat-adapter.json
```

Each command starts the adapter, verifies its registration, submits one
EvalRun, validates the response, and stops the process. No model credentials
or external agent runtime are required.

The manifest supplies identity, version, capabilities, and a launch command:

```json
{
  "schema_version": "agentbeat.adapter.v1",
  "id": "my-company/my-agent",
  "version": "1.0.0",
  "capabilities": ["text", "trace-events"],
  "launch": {
    "command": ["python3", "adapter.py"]
  }
}
```

AgentBeat launches the command from the manifest directory and injects:

- `AGENTBEAT_ADAPTER_HOST`
- `AGENTBEAT_ADAPTER_PORT`
- `AGENTBEAT_ADAPTER_ID`
- `AGENTBEAT_ADAPTER_VERSION`
- `AGENTBEAT_PROTOCOL_VERSION`
- `AGENTBEAT_TARGET`

For a real integration, replace the echo turn with a call to your agent
runtime while keeping the manifest and HTTP routes stable.
