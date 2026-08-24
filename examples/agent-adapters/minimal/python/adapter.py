import json
import os
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


ADAPTER_ID = os.environ.get("AGENTBEAT_ADAPTER_ID", "example/minimal-python")
ADAPTER_VERSION = os.environ.get("AGENTBEAT_ADAPTER_VERSION", "1.0.0")
PROTOCOL_VERSION = os.environ.get(
    "AGENTBEAT_PROTOCOL_VERSION", "agentbeat.eval.v1"
)
TARGET = os.environ.get("AGENTBEAT_TARGET", ADAPTER_ID)
CAPABILITIES = ["text", "trace-events"]

REGISTRATION = {
    "schema_version": "agentbeat.adapter.v1",
    "id": ADAPTER_ID,
    "version": ADAPTER_VERSION,
    "protocol_version": PROTOCOL_VERSION,
    "target": TARGET,
    "capabilities": CAPABILITIES,
}


def eval_run(payload):
    run_id = payload.get("run_id") or f"run_{int(time.time() * 1000)}"
    answer = f"Echo: {payload.get('prompt', '')}"
    now = int(time.time() * 1000)
    runtime_events = [
        {
            "event_type": "run_started",
            "source": "minimal-python",
            "timestamp_ms": now,
        },
        {
            "event_type": "final_answer",
            "source": "minimal-python",
            "timestamp_ms": now,
            "text": answer,
        },
    ]
    trace_events = [
        {
            "id": f"{run_id}:trace:{index}",
            "run_id": run_id,
            "event_index": index,
            **event,
            "payload": event,
        }
        for index, event in enumerate(runtime_events)
    ]
    observation = {
        "target_type": "agent",
        "answer": answer,
        "runtime_events": runtime_events,
        "trace_events": trace_events,
        "vars": payload.get("vars", {}),
    }
    return {
        "run_id": run_id,
        "status": "completed",
        "answer": answer,
        "judge_observation": observation,
        "judge_observation_text": json.dumps(observation),
        "eval_run": {
            "id": run_id,
            "status": "succeeded",
            "protocol_version": PROTOCOL_VERSION,
            "target": TARGET,
        },
        "runtime_events": runtime_events,
        "trace_events": trace_events,
        "artifact_manifest": {"run_id": run_id, "artifacts": []},
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self.send_json(
                200,
                {"ok": True, "adapter": ADAPTER_ID, "registration": REGISTRATION},
            )
            return
        self.send_json(404, {"error": "not found"})

    def do_POST(self):
        if self.path != "/v1/eval/runs":
            self.send_json(404, {"error": "not found"})
            return
        length = int(self.headers.get("content-length", "0"))
        payload = json.loads(self.rfile.read(length) or b"{}")
        if not payload.get("prompt"):
            self.send_json(400, {"error": "prompt is required"})
            return
        self.send_json(200, eval_run(payload))

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format, *_args):
        return


if __name__ == "__main__":
    host = os.environ.get("AGENTBEAT_ADAPTER_HOST", "127.0.0.1")
    port = int(os.environ.get("AGENTBEAT_ADAPTER_PORT", "8091"))
    ThreadingHTTPServer((host, port), Handler).serve_forever()
