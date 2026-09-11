#!/usr/bin/env python3
"""L1 protocol demo only. Replace invoke with your existing Agent call."""
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "sdk/agentbeat-sdk-py/src"))
from agentbeat_sdk import create_target_server


def invoke(context):
    # Replace this fixed response with your existing Agent(context.text).
    # Do not report synthetic messages/tool events as actual L2 observations.
    return {"final_response": "Use the verified account-recovery flow; identity checks cannot be bypassed."}


def main():
    token = os.environ.get("AGENTBEAT_TARGET_TOKEN", "").strip()
    if not token:
        raise SystemExit("Set AGENTBEAT_TARGET_TOKEN locally before starting this authenticated demo.")
    server = create_target_server(
        target_id="target-agent-quickstart", auth=token, invoke=invoke,
        evidence=False, host="127.0.0.1", port=8091,
    )
    print("Protocol demo only (not a real Agent): http://127.0.0.1:8091")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
