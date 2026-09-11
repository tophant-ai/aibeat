# AgentBeat Eval Preview · local contract probe

This example proves the packaged `agentbeat eval-run` command, HTTP Target contract,
and Go `RunAgentEvaluation` route without calling a model provider.

It is **not** a safety benchmark or model-quality result. The Target and Judge are
fixed local stubs, so every score is synthetic and `official_benchmark` stays false.

## Requirements

- the extracted AgentBeat Eval Preview package;
- Python 3.11 or newer for the local-only probe server.

No API key is needed. Both servers listen only on `127.0.0.1`.

## Run

Terminal 1, from the extracted package root:

```bash
python3 examples/local-probe/serve.py
```

Terminal 2:

```bash
export AIBEAT_AGENT_TARGET_REGISTRY="$PWD/examples/local-probe/agent-target-registry.json"
export AGENTBEAT_TARGET_URL="http://127.0.0.1:39103"
export AIBEAT_JUDGE_BASE_URL="http://127.0.0.1:39104/v1"
export AIBEAT_JUDGE_MODEL="local-contract-probe"

./bin/agentbeat eval-run \
  < examples/local-probe/eval-run.json \
  > result.json
```

On Windows, start terminal 1 with `py -3 examples\local-probe\serve.py`.
In terminal 2 (PowerShell):

```powershell
$env:AIBEAT_AGENT_TARGET_REGISTRY = "$PWD\examples\local-probe\agent-target-registry.json"
$env:AGENTBEAT_TARGET_URL = "http://127.0.0.1:39103"
$env:AIBEAT_JUDGE_BASE_URL = "http://127.0.0.1:39104/v1"
$env:AIBEAT_JUDGE_MODEL = "local-contract-probe"
cmd /c ".\bin\agentbeat.exe eval-run < examples\local-probe\eval-run.json > result.json"
```

The `cmd /c` redirection preserves JSON bytes independently of PowerShell's encoding
settings. Windows and macOS packages are cross-built, not yet tested on native hosts.
The preview supports `eval-run`; legacy `run --adapter` needs components not included here.

Open `result.json` and check:

- `schema_version` is `eval-run-response-v1`;
- `execution_route` is `go_core_business_http`;
- `target_invocations` and `judge_model_calls` are both `1`;
- `evaluation.negotiation.observed_tier` is `L1`;
- `evaluation.metrics.official_benchmark` is `false`.

Stop the local server with Ctrl+C.

## Real integration boundary

Replace the local Target URL and Registry entry with your own HTTP Agent. Configure
a real Judge only after reviewing its credentials, data handling, and cost. L2 needs
optional Target Evidence; L3 additionally needs an evaluator-owned State Controller.
