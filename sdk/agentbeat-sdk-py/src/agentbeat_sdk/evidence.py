"""Canonical target-evidence-v1 collection primitives."""

from __future__ import annotations

import copy
import json
import math
import re
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any, Callable, Iterable, Mapping

RUN_ID_RE = re.compile(r"^run-[a-z0-9][a-z0-9-]*$")
CASE_ID_RE = re.compile(r"^case-[a-z0-9][a-z0-9-]*$")
RFC3339_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$")
CHANNELS = frozenset({"messages", "tools", "files"})
MAX_SAFE_INTEGER = 9_007_199_254_740_991
TRUNCATION_MARKER = "\n[truncated]"
EVENT_CHANNEL = {
    "message": "messages",
    "message.delta": "messages",
    "tool.call": "tools",
    "tool.result": "tools",
    "command.result": "tools",
    "file.change": "files",
    "run.error": "messages",
    "lifecycle": "messages",
}
EVENT_DATA_KEYS = {
    "message": frozenset({"role", "text", "attributes"}),
    "message.delta": frozenset({"role", "delta", "attributes"}),
    "tool.call": frozenset({"call_id", "name", "arguments", "attributes"}),
    "tool.result": frozenset({"call_id", "name", "result", "is_error", "status", "error", "attributes"}),
    "command.result": frozenset({"command", "exit_code", "output", "status", "attributes"}),
    "file.change": frozenset({"path", "diff", "changes", "status", "attributes"}),
    "run.error": frozenset({"message", "attributes"}),
    "lifecycle": frozenset({"name", "status", "attributes"}),
}
SENSITIVE_KEY_RE = re.compile(
    r"^(authorization|proxy_authorization|cookie|set_cookie|password|passwd|api_key|token|secret|credential)$|_(?:password|passwd|api_key|token|secret|credential)$",
)


def _required_string(value: Any, name: str, *, pattern: re.Pattern[str] | None = None, limit: int = 32768) -> str:
    if not isinstance(value, str) or not value or len(value) > limit or (pattern and not pattern.fullmatch(value)):
        raise TypeError(f"{name} is invalid")
    return value


def _timestamp(value: datetime | str, name: str) -> str:
    if isinstance(value, str):
        if not RFC3339_RE.fullmatch(value):
            raise TypeError(f"{name} must be RFC3339 with a timezone")
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError as exc:
            raise TypeError(f"{name} must be a valid timestamp") from exc
    elif isinstance(value, datetime):
        parsed = value
    else:
        raise TypeError(f"{name} must be a valid timestamp")
    if parsed.tzinfo is None:
        raise TypeError(f"{name} must include a timezone")
    return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _plain_mapping(value: Any, name: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise TypeError(f"{name} must be an object")
    return value


def _string(value: Any, name: str, *, limit: int = 32768) -> str:
    if not isinstance(value, str) or len(value) > limit:
        raise TypeError(f"{name} must be a string")
    return value


def _bounded(
    value: Any,
    *,
    max_string_length: int,
    max_collection_items: int,
    max_depth: int,
    redactor: Callable[[str, Any], Any],
    depth: int = 0,
    key: str = "",
) -> Any:
    value = redactor(key, value)
    if isinstance(value, str):
        return value if len(value) <= max_string_length else value[: max_string_length - len(TRUNCATION_MARKER)] + TRUNCATION_MARKER
    if isinstance(value, float) and not math.isfinite(value):
        raise TypeError("Evidence values must be finite JSON numbers")
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if depth >= max_depth:
        return "[truncated:depth]"
    if isinstance(value, (list, tuple)):
        return [
            _bounded(
                item,
                max_string_length=max_string_length,
                max_collection_items=max_collection_items,
                max_depth=max_depth,
                redactor=redactor,
                depth=depth + 1,
            )
            for item in value[:max_collection_items]
        ]
    if isinstance(value, Mapping):
        return {
            str(nested_key)[:256]: _bounded(
                nested,
                max_string_length=max_string_length,
                max_collection_items=max_collection_items,
                max_depth=max_depth,
                redactor=redactor,
                depth=depth + 1,
                key=str(nested_key),
            )
            for nested_key, nested in list(value.items())[:max_collection_items]
        }
    return str(value)


def _default_redactor(key: str, value: Any) -> Any:
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", str(key).strip()).lower()
    normalized = re.sub(r"[-.\s]+", "_", normalized)
    return "[redacted]" if SENSITIVE_KEY_RE.search(normalized) else value


def _validate_data(event_type: str, raw: Mapping[str, Any]) -> dict[str, Any]:
    data = dict(_plain_mapping(raw, f"{event_type}.data"))
    allowed = EVENT_DATA_KEYS.get(event_type)
    if allowed is None:
        raise TypeError(f"unsupported Evidence event type {event_type}")
    unknown = set(data) - allowed
    if unknown:
        raise TypeError(f"{event_type}.data contains unsupported field {sorted(unknown)[0]}")
    data.setdefault("attributes", {})
    _plain_mapping(data["attributes"], f"{event_type}.attributes")
    if event_type == "message":
        if data.get("role") not in {"system", "user", "assistant", "tool"}:
            raise TypeError("message.role is invalid")
        _required_string(data.get("text"), "message.text")
    elif event_type == "message.delta":
        if data.get("role") not in {"assistant", "tool"}:
            raise TypeError("message.delta role is invalid")
        _required_string(data.get("delta"), "message.delta")
    elif event_type == "tool.call":
        _required_string(data.get("call_id"), "tool.call call_id", limit=256)
        _required_string(data.get("name"), "tool.call name", limit=256)
        _plain_mapping(data.get("arguments"), "tool.call arguments")
    elif event_type == "tool.result":
        _required_string(data.get("call_id"), "tool.result call_id", limit=256)
        _required_string(data.get("name"), "tool.result name", limit=256)
        if "result" not in data or not isinstance(data.get("is_error"), bool):
            raise TypeError("tool.result requires result and boolean is_error")
        if "status" in data:
            _string(data["status"], "tool.result status", limit=128)
    elif event_type == "command.result":
        _required_string(data.get("command"), "command.result command")
        if (
            not isinstance(data.get("exit_code"), int)
            or isinstance(data.get("exit_code"), bool)
            or abs(data["exit_code"]) > MAX_SAFE_INTEGER
        ):
            raise TypeError("command.result exit_code must be an integer")
        _string(data.get("output"), "command.result output")
        if "status" in data:
            _string(data["status"], "command.result status", limit=128)
    elif event_type == "file.change":
        _required_string(data.get("path"), "file.change path")
        if "diff" not in data and "changes" not in data:
            raise TypeError("file.change requires diff or changes")
        if "diff" in data:
            _string(data["diff"], "file.change diff")
        if "changes" in data and not isinstance(data["changes"], list):
            raise TypeError("file.change changes must be an array")
        if "status" in data:
            _string(data["status"], "file.change status", limit=128)
    elif event_type == "run.error":
        _required_string(data.get("message"), "run.error message")
    elif event_type == "lifecycle":
        _required_string(data.get("name"), "lifecycle name", limit=128)
        if "status" in data:
            _string(data["status"], "lifecycle status", limit=128)
    return data


class EvidenceCollector:
    """Builds bounded L2 Evidence and never creates a score or EvalRun."""

    def __init__(
        self,
        *,
        run_id: str,
        case_id: str,
        source: str = "agentbeat-sdk",
        observed_channels: Iterable[str] = ("messages", "tools"),
        started_at: datetime | str | None = None,
        clock: Callable[[], datetime] = _utcnow,
        max_events: int = 5000,
        max_bytes: int = 4 << 20,
        max_string_length: int = 32768,
        max_collection_items: int = 100,
        max_depth: int = 5,
        redact: Callable[[str, Any], Any] = _default_redactor,
    ) -> None:
        self.run_id = _required_string(run_id, "run_id", pattern=RUN_ID_RE, limit=160)
        self.case_id = _required_string(case_id, "case_id", pattern=CASE_ID_RE, limit=200)
        self.source = _required_string(source, "source", limit=160)
        channels = sorted(set(observed_channels))
        if not channels or any(channel not in CHANNELS for channel in channels):
            raise TypeError("observed_channels contains an unsupported channel")
        if "messages" not in channels or "tools" not in channels:
            raise TypeError("observed_channels must include messages and tools for L2 Evidence")
        if not callable(clock) or not callable(redact):
            raise TypeError("clock and redact must be callable")
        if isinstance(max_events, bool) or not isinstance(max_events, int) or not 1 <= max_events <= 5000:
            raise TypeError("max_events must be an integer from 1 to 5000")
        if not isinstance(max_bytes, int) or max_bytes < 1024:
            raise TypeError("max_bytes must be at least 1024")
        if not 128 <= max_string_length <= 32768 or max_collection_items < 1 or max_depth < 1:
            raise TypeError("Evidence bounds are invalid")
        self.observed_channels = channels
        self.started_at = _timestamp(started_at if started_at is not None else clock(), "started_at")
        self.clock = clock
        self.max_events = max_events
        self.max_bytes = max_bytes
        self.bounds = {
            "max_string_length": max_string_length,
            "max_collection_items": max_collection_items,
            "max_depth": max_depth,
            "redactor": redact,
        }
        self._events: list[dict[str, Any]] = []
        self._encoded_bytes = 0
        self._tool_calls: dict[str, str] = {}
        self._tool_results: set[str] = set()
        self._finalized = False

    def event(
        self,
        *,
        type: str,
        data: Mapping[str, Any],
        source: str | None = None,
        occurred_at: datetime | str | None = None,
    ) -> dict[str, Any]:
        if self._finalized:
            raise RuntimeError("EvidenceCollector is already finalized")
        channel = EVENT_CHANNEL.get(type)
        if channel is None or channel not in self.observed_channels:
            raise TypeError(f"Evidence event {type} is unsupported or its channel was not declared")
        validated = _validate_data(type, data)
        normalized = _bounded(validated, **self.bounds)
        normalized = _validate_data(type, normalized)
        self._validate_tool_binding(type, normalized)
        sequence = len(self._events)
        event = {
            "event_id": f"{self.run_id}:event:{sequence}",
            "sequence": sequence,
            "occurred_at": _timestamp(occurred_at if occurred_at is not None else self.clock(), "occurred_at"),
            "source": _required_string(source or self.source, "event.source", limit=160),
            "type": type,
            "data": normalized,
        }
        size = len(json.dumps(event, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode())
        if sequence >= self.max_events:
            raise RuntimeError("Evidence event limit exceeded")
        if self._encoded_bytes + size > self.max_bytes:
            raise RuntimeError("Evidence byte limit exceeded")
        self._events.append(event)
        self._encoded_bytes += size
        return copy.deepcopy(event)

    def _validate_tool_binding(self, event_type: str, data: Mapping[str, Any]) -> None:
        call_id = data.get("call_id")
        if event_type == "tool.call":
            if call_id in self._tool_calls:
                raise RuntimeError(f"duplicate tool call_id {call_id}")
            self._tool_calls[str(call_id)] = str(data["name"])
        elif event_type == "tool.result":
            if call_id not in self._tool_calls:
                raise RuntimeError(f"tool result has no matching call {call_id}")
            if self._tool_calls[str(call_id)] != data["name"]:
                raise RuntimeError(f"tool result name does not match call {call_id}")
            if call_id in self._tool_results:
                raise RuntimeError(f"duplicate tool result for call {call_id}")
            self._tool_results.add(str(call_id))

    def message(self, *, role: str = "assistant", text: str, **attributes: Any) -> dict[str, Any]:
        return self.event(type="message", data={"role": role, "text": text, "attributes": attributes})

    def message_delta(self, *, delta: str, role: str = "assistant", **attributes: Any) -> dict[str, Any]:
        return self.event(type="message.delta", data={"role": role, "delta": delta, "attributes": attributes})

    def tool_call(self, *, call_id: str, name: str, arguments: Mapping[str, Any], **attributes: Any) -> dict[str, Any]:
        return self.event(type="tool.call", data={"call_id": call_id, "name": name, "arguments": arguments, "attributes": attributes})

    def tool_result(
        self, *, call_id: str, name: str, result: Any = None, is_error: bool = False,
        status: str | None = None, error: Any = None, **attributes: Any,
    ) -> dict[str, Any]:
        data = {"call_id": call_id, "name": name, "result": result, "is_error": is_error, "attributes": attributes}
        if status is not None:
            data["status"] = status
        if error is not None:
            data["error"] = str(error)
        return self.event(type="tool.result", data=data)

    def command_result(
        self, *, command: str, exit_code: int, output: str, status: str | None = None,
        **attributes: Any,
    ) -> dict[str, Any]:
        data: dict[str, Any] = {
            "command": command, "exit_code": exit_code, "output": output, "attributes": attributes,
        }
        if status is not None:
            data["status"] = status
        return self.event(type="command.result", data=data)

    def file_change(
        self, *, path: str, diff: str | None = None, changes: list[Any] | None = None,
        status: str | None = None, **attributes: Any,
    ) -> dict[str, Any]:
        data: dict[str, Any] = {"path": path, "attributes": attributes}
        if diff is not None:
            data["diff"] = diff
        if changes is not None:
            data["changes"] = changes
        if status is not None:
            data["status"] = status
        return self.event(type="file.change", data=data)

    def lifecycle(self, name: str, *, status: str | None = None, **attributes: Any) -> dict[str, Any]:
        data = {"name": name, "attributes": attributes}
        if status is not None:
            data["status"] = status
        return self.event(type="lifecycle", data=data)

    def error(self, error: BaseException | str, **attributes: Any) -> dict[str, Any]:
        return self.event(type="run.error", data={"message": str(error), "attributes": attributes})

    def to_events(self) -> list[dict[str, Any]]:
        return copy.deepcopy(self._events)

    def finalize(self, *, finished_at: datetime | str | None = None) -> dict[str, Any]:
        if self._finalized:
            raise RuntimeError("EvidenceCollector is already finalized")
        document = {
            "schema_version": "target-evidence-v1",
            "run_id": self.run_id,
            "case_id": self.case_id,
            "assurance_level": "L2",
            "observed_channels": list(self.observed_channels),
            "started_at": self.started_at,
            "finished_at": _timestamp(finished_at if finished_at is not None else self.clock(), "finished_at"),
            "events": self.to_events(),
        }
        if not document["events"]:
            raise RuntimeError("Evidence must contain at least one event")
        if document["finished_at"] < document["started_at"]:
            raise RuntimeError("Evidence finished_at precedes started_at")
        if len(json.dumps(document, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode()) > self.max_bytes:
            raise RuntimeError("Evidence document byte limit exceeded")
        self._finalized = True
        return document


def build_target_evidence(*, events: Iterable[Mapping[str, Any]], finished_at: datetime | str, **options: Any) -> dict[str, Any]:
    collector = EvidenceCollector(**options)
    for event in events:
        collector.event(**dict(event))
    return collector.finalize(finished_at=finished_at)


class BoundedEvidenceStore:
    def __init__(self, max_runs: int = 100) -> None:
        if not isinstance(max_runs, int) or max_runs < 1:
            raise TypeError("max_runs must be positive")
        self.max_runs = max_runs
        self._entries: OrderedDict[str, dict[str, Any]] = OrderedDict()

    def put(self, run_id: str, evidence: Mapping[str, Any]) -> None:
        _required_string(run_id, "run_id", pattern=RUN_ID_RE, limit=160)
        if evidence.get("schema_version") != "target-evidence-v1" or evidence.get("run_id") != run_id:
            raise TypeError("Evidence Store run binding is invalid")
        self._entries.pop(run_id, None)
        self._entries[run_id] = copy.deepcopy(dict(evidence))
        while len(self._entries) > self.max_runs:
            self._entries.popitem(last=False)

    def get(self, run_id: str) -> dict[str, Any] | None:
        value = self._entries.get(run_id)
        return copy.deepcopy(value) if value is not None else None
