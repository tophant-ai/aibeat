"""Thin LangGraph completed-message projection into target-evidence-v1."""

from __future__ import annotations

import json
from typing import Any, Mapping

from ..evidence import EvidenceCollector


def _value(message: Any, name: str, fallback: Any = None) -> Any:
    if isinstance(message, Mapping):
        return message.get(name, fallback)
    return getattr(message, name, fallback)


def _message_type(message: Any) -> str:
    value = _value(message, "type", "")
    if value:
        return str(value)
    return message.__class__.__name__.removesuffix("Message").lower()


def _text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, Mapping) and item.get("type") in {"text", "output_text"} and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "".join(parts)
    if content is None:
        return ""
    return str(content)


def _json_result(content: Any) -> Any:
    if not isinstance(content, str):
        return content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return content


class LangGraphObserver:
    """Consumes `stream_mode="updates"` output without changing graph nodes."""

    def __init__(self, collector: EvidenceCollector, *, source: str = "langgraph") -> None:
        self.collector = collector
        self.source = source
        self._seen_messages: set[str] = set()
        self._tool_names: dict[str, str] = {}
        self._tool_results: set[str] = set()
        self.final_response = ""

    def observe_stream_part(self, part: Any) -> None:
        """Accept LangGraph v1 update chunks or the v2 typed stream envelope."""
        if isinstance(part, Mapping) and part.get("type") == "updates":
            self.observe_updates(part.get("data", {}))
            return
        self.observe_updates(part)

    def observe_updates(self, updates: Any) -> None:
        if not isinstance(updates, Mapping):
            return
        for node_name, state_update in updates.items():
            if not isinstance(state_update, Mapping):
                continue
            messages = state_update.get("messages", [])
            if not isinstance(messages, (list, tuple)):
                messages = [messages]
            for message in messages:
                self.observe_message(message, node_name=str(node_name))

    def observe_message(self, message: Any, *, node_name: str = "") -> None:
        message_type = _message_type(message)
        message_id = str(_value(message, "id", "") or "")
        identity = message_id or f"{message_type}:{id(message)}"
        if identity in self._seen_messages:
            return
        self._seen_messages.add(identity)
        attributes = {"node": node_name}
        if message_id:
            attributes["message_id"] = message_id

        if message_type in {"ai", "assistant"}:
            for call in _value(message, "tool_calls", []) or []:
                if not isinstance(call, Mapping):
                    continue
                call_id = str(call.get("id") or "")
                name = str(call.get("name") or "")
                arguments = call.get("args", {})
                if call_id and name and isinstance(arguments, Mapping) and call_id not in self._tool_names:
                    self.collector.event(
                        type="tool.call",
                        source=self.source,
                        data={"call_id": call_id, "name": name, "arguments": arguments, "attributes": attributes},
                    )
                    self._tool_names[call_id] = name
            text = _text(_value(message, "content", ""))
            if text:
                self.collector.event(
                    type="message", source=self.source,
                    data={"role": "assistant", "text": text, "attributes": attributes},
                )
                self.final_response = text
            return

        if message_type == "tool":
            call_id = str(_value(message, "tool_call_id", "") or "")
            name = str(_value(message, "name", "") or self._tool_names.get(call_id, ""))
            if call_id and name and call_id not in self._tool_results:
                status = str(_value(message, "status", "success") or "success")
                self.collector.event(
                    type="tool.result",
                    source=self.source,
                    data={
                        "call_id": call_id,
                        "name": name,
                        "result": _json_result(_value(message, "content")),
                        "is_error": status in {"error", "failed"},
                        "status": status,
                        "attributes": attributes,
                    },
                )
                self._tool_results.add(call_id)
            return

        if message_type in {"human", "user", "system"}:
            text = _text(_value(message, "content", ""))
            if text:
                role = "user" if message_type in {"human", "user"} else "system"
                self.collector.event(
                    type="message", source=self.source,
                    data={"role": role, "text": text, "attributes": attributes},
                )
