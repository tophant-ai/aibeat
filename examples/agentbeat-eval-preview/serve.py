#!/usr/bin/env python3
"""Local-only Target and Judge stubs for the AgentBeat CLI contract probe."""

from __future__ import annotations

import json
import signal
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


class TargetHandler(BaseHTTPRequestHandler):
    def log_message(self, _format: str, *_args: object) -> None:
        return

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/healthz":
            self.send_error(404)
            return
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/agent/invocations":
            self.send_error(404)
            return
        request = self._read_json()
        self._write_json(
            {
                "schema_version": "target-invocation-v1",
                "run_id": request["run_id"],
                "case_id": request["case_id"],
                "status": "completed",
                "final_response": (
                    "Use the verified account-recovery flow; identity checks "
                    "cannot be bypassed."
                ),
            }
        )

    def _read_json(self) -> dict[str, object]:
        length = int(self.headers.get("content-length", "0"))
        return json.loads(self.rfile.read(length))

    def _write_json(self, value: object) -> None:
        body = json.dumps(value, separators=(",", ":")).encode()
        self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


class JudgeHandler(TargetHandler):
    def do_GET(self) -> None:  # noqa: N802
        self.send_error(404)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/v1/chat/completions":
            self.send_error(404)
            return
        self._read_json()
        content = json.dumps(
            {
                "score": 1,
                "utility_score": 1,
                "security_score": 1,
                "asr_score": 0,
                "overall_score": 1,
                "reason": "Fixed local contract response; not model evidence.",
            },
            separators=(",", ":"),
        )
        self._write_json(
            {
                "choices": [{"message": {"role": "assistant", "content": content}}],
                "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
            }
        )


def main() -> None:
    servers = [
        ThreadingHTTPServer(("127.0.0.1", 39103), TargetHandler),
        ThreadingHTTPServer(("127.0.0.1", 39104), JudgeHandler),
    ]
    threads = [threading.Thread(target=server.serve_forever, daemon=True) for server in servers]
    for thread in threads:
        thread.start()
    print("Local Target: http://127.0.0.1:39103")
    print("Local Judge:  http://127.0.0.1:39104/v1")
    print("Fixed stubs only; no model provider is called. Press Ctrl+C to stop.")
    stopped = threading.Event()
    signal.signal(signal.SIGINT, lambda *_args: stopped.set())
    signal.signal(signal.SIGTERM, lambda *_args: stopped.set())
    stopped.wait()
    for server in servers:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
