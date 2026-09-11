"""Dependency-free canonical HTTP Target server for Python Agents."""

from __future__ import annotations

import hashlib
import hmac
import json
import re
import threading
from collections import deque
from dataclasses import dataclass
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Callable, Mapping
from urllib.parse import unquote, urlsplit

from .evidence import BoundedEvidenceStore, EvidenceCollector, CASE_ID_RE, RUN_ID_RE

INVOCATION_PATH = "/v1/agent/invocations"
EVIDENCE_PATH = "/v1/evidence"
FORBIDDEN_METADATA_KEY_RE = re.compile(
    r"(^|_)(model|model_id|base_url|endpoint|api_key|key|token|secret|workspace|cwd|sandbox|tools?|mcp|runtime|executor|profile|fixture|state|verifier|oracle|control|sidecar)($|_)",
)


class RequestFailure(RuntimeError):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(message)
        self.status = status
        self.code = code


@dataclass(frozen=True)
class InvocationContext:
    run_id: str
    case_id: str
    text: str
    metadata: Mapping[str, Any]
    observe: EvidenceCollector | None


def read_bearer_token(path: str | Path) -> str:
    value = Path(path).read_text(encoding="utf-8").strip()
    if not value or value in {"REPLACE_ME", "NO_AUTH"}:
        raise RuntimeError("Target bearer token file is empty or contains a placeholder")
    return value


def _reject_unknown(value: Mapping[str, Any], allowed: set[str], location: str) -> None:
    unknown = set(value) - allowed
    if unknown:
        raise RequestFailure(400, "invalid_request_schema", f"{location} contains unknown field {sorted(unknown)[0]}")


def _assert_no_runtime_overrides(value: Any, path: str = "metadata", depth: int = 0) -> None:
    if depth > 8:
        raise RequestFailure(400, "invalid_metadata", "metadata nesting is too deep")
    if isinstance(value, list):
        for index, nested in enumerate(value):
            _assert_no_runtime_overrides(nested, f"{path}[{index}]", depth + 1)
        return
    if not isinstance(value, Mapping):
        return
    for key, nested in value.items():
        normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", str(key).strip()).lower().replace("-", "_").replace(".", "_")
        if FORBIDDEN_METADATA_KEY_RE.search(normalized):
            raise RequestFailure(400, "runtime_override_forbidden", f"{path}.{key} cannot configure the Target runtime")
        _assert_no_runtime_overrides(nested, f"{path}.{key}", depth + 1)


def _task_id(run_id: str, case_id: str) -> str:
    digest = hashlib.sha256(f"{run_id}\0{case_id}".encode()).hexdigest()[:24]
    return f"task-{digest}"


def _reject_json_constant(value: str) -> None:
    raise ValueError(f"non-standard JSON constant {value} is not allowed")


def _parse_invocation(value: Any, headers: Mapping[str, str]) -> tuple[str, str, str, Mapping[str, Any]]:
    if not isinstance(value, Mapping):
        raise RequestFailure(400, "invalid_request_schema", "request must be a JSON object")
    _reject_unknown(value, {"schema_version", "run_id", "case_id", "input", "metadata"}, "request")
    if value.get("schema_version") != "target-invocation-v1":
        raise RequestFailure(400, "target_invocation_schema_invalid", "schema_version must be target-invocation-v1")
    run_id, case_id = value.get("run_id"), value.get("case_id")
    if not isinstance(run_id, str) or len(run_id) > 160 or not RUN_ID_RE.fullmatch(run_id):
        raise RequestFailure(400, "invalid_run_id", "run_id is invalid")
    if not isinstance(case_id, str) or len(case_id) > 200 or not CASE_ID_RE.fullmatch(case_id):
        raise RequestFailure(400, "invalid_case_id", "case_id is invalid")
    input_value = value.get("input")
    if not isinstance(input_value, Mapping):
        raise RequestFailure(400, "invalid_input", "input must be an object")
    _reject_unknown(input_value, {"text"}, "input")
    text = input_value.get("text")
    if not isinstance(text, str) or not text.strip() or len(text.encode()) > 512 * 1024:
        raise RequestFailure(400, "invalid_input", "input.text must be a non-empty string no larger than 512 KiB")
    metadata = value.get("metadata", {})
    if not isinstance(metadata, Mapping):
        raise RequestFailure(400, "invalid_metadata", "metadata must be an object")
    _assert_no_runtime_overrides(metadata)
    if headers.get("x-aibeat-run-id") != run_id or headers.get("x-aibeat-case-id") != case_id:
        raise RequestFailure(400, "correlation_binding_mismatch", "AI Beat correlation headers must exactly match the request body")
    return run_id, case_id, text, metadata


def create_target_server(
    *,
    target_id: str,
    auth: str,
    invoke: Callable[[InvocationContext], Mapping[str, Any]],
    host: str = "127.0.0.1",
    port: int = 8091,
    connector_id: str = "business-http-json-v1",
    evidence: bool | Mapping[str, Any] = True,
    max_concurrent_runs: int = 1,
    max_request_bytes: int = 1 << 20,
    max_claimed_runs: int = 10000,
    health: Mapping[str, Any] | Callable[[], Mapping[str, Any]] | None = None,
) -> ThreadingHTTPServer:
    """Return an unstarted ThreadingHTTPServer implementing the Target protocol."""
    if not isinstance(target_id, str) or not target_id.strip() or not isinstance(auth, str) or not auth.strip():
        raise TypeError("target_id and auth are required")
    if not callable(invoke):
        raise TypeError("invoke must be callable")
    if max_concurrent_runs < 1 or max_request_bytes < 1024 or max_claimed_runs < 1:
        raise TypeError("Target server limits are invalid")
    evidence_enabled = evidence is not False
    evidence_options = dict(evidence) if isinstance(evidence, Mapping) else {}
    store = evidence_options.pop("store", None) or BoundedEvidenceStore(int(evidence_options.get("max_runs", 100)))
    active: set[str] = set()
    claimed: set[str] = set()
    claim_order: deque[str] = deque()
    lock = threading.Lock()
    semaphore = threading.BoundedSemaphore(max_concurrent_runs)

    class TargetHandler(BaseHTTPRequestHandler):
        server_version = "AgentBeatTarget/1"

        def log_message(self, _format: str, *_args: Any) -> None:
            return

        def _json(self, status: int, value: Any) -> None:
            payload = json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.end_headers()
            self.wfile.write(payload)

        def _authorized(self) -> bool:
            return hmac.compare_digest(self.headers.get("Authorization", "").encode(), f"Bearer {auth}".encode())

        def _body(self) -> Any:
            if not self.headers.get("Content-Type", "").lower().startswith("application/json"):
                raise RequestFailure(415, "unsupported_media_type", "Content-Type must be application/json")
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError as exc:
                raise RequestFailure(400, "invalid_request_schema", "Content-Length is invalid") from exc
            if length < 1 or length > max_request_bytes:
                raise RequestFailure(413, "request_too_large", "request body exceeds configured limit")
            try:
                return json.loads(self.rfile.read(length), parse_constant=_reject_json_constant)
            except (ValueError, UnicodeDecodeError) as exc:
                raise RequestFailure(400, "invalid_json", "request body is not valid JSON") from exc

        def _handle(self) -> None:
            path = urlsplit(self.path).path
            if self.command == "GET" and path == "/healthz":
                details = health() if callable(health) else dict(health or {})
                self._json(200, {
                    **details,
                    "status": "ok",
                    "target_id": target_id,
                    "connector_id": connector_id,
                    "invocation_protocol": "target-invocation-v1",
                    "invocation_path": INVOCATION_PATH,
                    "evidence": "L2" if evidence_enabled else "L1",
                    "active_runs": len(active),
                    "max_concurrent_runs": max_concurrent_runs,
                })
                return
            if not self._authorized():
                self._json(401, {"error": {"code": "unauthorized", "message": "valid Target bearer token required"}})
                return
            if self.command == "GET" and path.startswith(EVIDENCE_PATH + "/"):
                if not evidence_enabled:
                    raise RequestFailure(404, "not_found", "Evidence collection is disabled")
                run_id = unquote(path[len(EVIDENCE_PATH) + 1:])
                document = store.get(run_id) if RUN_ID_RE.fullmatch(run_id) else None
                if document is None:
                    raise RequestFailure(404, "not_found", "Evidence not found")
                self._json(200, document)
                return
            if self.command != "POST" or path != INVOCATION_PATH:
                raise RequestFailure(404, "not_found", "route not found")
            run_id, case_id, text, metadata = _parse_invocation(
                self._body(), {key.lower(): value for key, value in self.headers.items()},
            )
            with lock:
                if run_id in claimed or run_id in active:
                    raise RequestFailure(409, "run_id_reused", "run_id has already been accepted")
                if not semaphore.acquire(blocking=False):
                    raise RequestFailure(503, "target_busy", "Target concurrency limit reached")
                claimed.add(run_id)
                claim_order.append(run_id)
                while len(claim_order) > max_claimed_runs:
                    claimed.discard(claim_order.popleft())
                active.add(run_id)
            try:
                collector = None
                if evidence_enabled:
                    collector_options = {
                        key: value for key, value in evidence_options.items()
                        if key in {"source", "observed_channels", "max_events", "max_bytes", "max_string_length", "max_collection_items", "max_depth", "redact"}
                    }
                    collector = EvidenceCollector(run_id=run_id, case_id=case_id, **collector_options)
                result = invoke(InvocationContext(run_id, case_id, text, metadata, collector))
                if not isinstance(result, Mapping) or not isinstance(result.get("final_response"), str) or not result["final_response"].strip():
                    raise RuntimeError("Agent invoke returned no final_response")
                if collector is not None:
                    store.put(run_id, collector.finalize())
                custom_metadata = result.get("metadata") if isinstance(result.get("metadata"), Mapping) else {}
                response = {
                    "schema_version": "target-invocation-v1",
                    "run_id": run_id,
                    "case_id": case_id,
                    "task_id": _task_id(run_id, case_id),
                    "status": "completed",
                    "final_response": result["final_response"],
                    "metadata": {
                        **custom_metadata,
                        "target_id": target_id,
                        "connector_id": connector_id,
                        "evidence_level": "L2" if evidence_enabled else "L1",
                    },
                }
                if collector is not None:
                    response["evidence_ref"] = f"{EVIDENCE_PATH}/{run_id}"
                if isinstance(result.get("usage"), Mapping):
                    response["usage"] = result["usage"]
                self._json(200, response)
            except RequestFailure:
                raise
            except Exception:
                raise RequestFailure(502, "target_execution_failed", "Agent Target execution failed") from None
            finally:
                with lock:
                    active.discard(run_id)
                    semaphore.release()

        def do_GET(self) -> None:  # noqa: N802
            self._dispatch()

        def do_POST(self) -> None:  # noqa: N802
            self._dispatch()

        def _dispatch(self) -> None:
            try:
                self._handle()
            except RequestFailure as exc:
                self._json(exc.status, {"error": {"code": exc.code, "message": str(exc)}})
            except Exception:
                self._json(500, {"error": {"code": "internal_error", "message": "Target internal error"}})

    return ThreadingHTTPServer((host, port), TargetHandler)
