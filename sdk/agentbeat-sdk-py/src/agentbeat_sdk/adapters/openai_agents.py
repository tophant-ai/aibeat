"""Thin OpenAI Agents tracing projection into target-evidence-v1.

The Agents SDK delivers tracing callbacks through a process-global registry.  This
module registers one lazy router at run time; the router binds each started trace
to the collector active in that ``ContextVar`` and then dispatches only that
trace's spans to its per-run mapper.
"""

from __future__ import annotations

import contextvars
import json
import logging
import threading
from contextlib import contextmanager
from typing import Any, Iterator, Mapping

from ..evidence import EvidenceCollector

try:
    from agents.tracing import TracingProcessor, add_trace_processor
    from agents.tracing.span_data import (
        AgentSpanData,
        FunctionSpanData,
        GenerationSpanData,
        HandoffSpanData,
        ResponseSpanData,
    )
except ImportError as exc:  # pragma: no cover - exercised by consumers without the optional integration
    raise ImportError(
        "OpenAI Agents support requires openai-agents==0.22.0. "
        "Install the optional integration dependency before importing this module."
    ) from exc


logger = logging.getLogger(__name__)


def _value(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, Mapping):
        return item.get(name, default)
    return getattr(item, name, default)


def _identifier(value: Any, fallback: str) -> str:
    rendered = str(value or "")
    return rendered if rendered else fallback


def _arguments(raw: Any) -> dict[str, Any]:
    """Return a collector-compatible object without discarding malformed tool input."""
    if raw is None:
        return {}
    if isinstance(raw, Mapping):
        return dict(raw)
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {"raw_input": raw}
        if isinstance(parsed, Mapping):
            return dict(parsed)
        return {"raw_input": raw}
    return {"raw_input": str(raw)}


def _content_text(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, (list, tuple)):
        return "".join(_content_text(item) for item in content)
    if isinstance(content, Mapping):
        item_type = str(content.get("type") or "")
        if item_type in {"text", "output_text", "input_text"} and isinstance(content.get("text"), str):
            return content["text"]
        nested = content.get("content")
        if nested is not None:
            return _content_text(nested)
        if isinstance(content.get("text"), str):
            return content["text"]
        return ""
    item_type = str(_value(content, "type", "") or "")
    text = _value(content, "text")
    if item_type in {"text", "output_text", "input_text"} and isinstance(text, str):
        return text
    nested = _value(content, "content")
    if nested is not None:
        return _content_text(nested)
    return text if isinstance(text, str) else ""


def _assistant_texts(output: Any) -> list[str]:
    if output is None:
        return []
    values = output if isinstance(output, (list, tuple)) else [_value(output, "output", output)]
    texts: list[str] = []
    for message in values:
        role = _value(message, "role")
        if role != "assistant":
            continue
        text = _content_text(_value(message, "content", _value(message, "text", "")))
        if text:
            texts.append(text)
    return texts


def _span_attributes(span: Any) -> dict[str, Any]:
    attributes: dict[str, Any] = {
        "span_id": _identifier(_value(span, "span_id"), f"span-{id(span)}"),
        "trace_id": _identifier(_value(span, "trace_id"), "trace-unavailable"),
    }
    for name in ("parent_id", "started_at", "ended_at"):
        value = _value(span, name)
        if value is not None:
            attributes[name] = value
    metadata = _value(span, "trace_metadata")
    if isinstance(metadata, Mapping):
        attributes["trace_metadata"] = dict(metadata)
    return attributes


def _trace_attributes(trace: Any) -> dict[str, Any]:
    attributes = {"trace_id": _identifier(_value(trace, "trace_id"), f"trace-{id(trace)}")}
    for name, attribute_name in (("name", "trace_name"), ("group_id", "group_id")):
        value = _value(trace, name)
        if value is not None:
            attributes[attribute_name] = value
    metadata = _value(trace, "metadata")
    if isinstance(metadata, Mapping):
        attributes["trace_metadata"] = dict(metadata)
    return attributes


class OpenAIAgentsTracingProcessor(TracingProcessor):
    """Map one OpenAI Agents trace into one ``EvidenceCollector``.

    Instances are deliberately per invocation. Use ``observe_openai_agents_run``
    around ``Runner.run*`` so the global SDK callback registry can route each
    trace to the correct per-run collector.
    """

    def __init__(self, collector: EvidenceCollector, *, source: str = "openai-agents") -> None:
        self.collector = collector
        self.source = source
        self.final_response = ""
        self._lock = threading.RLock()
        self._ended_spans: set[str] = set()
        self._traces_started = 0
        self._degradation_recorded = False

    def _safe(self, callback: str, action: Any) -> None:
        try:
            action()
        except Exception:
            # A processor is an observability side channel: never interrupt Runner.
            logger.exception("OpenAI Agents evidence mapping failed during %s", callback)

    def on_trace_start(self, trace: Any) -> None:
        def emit() -> None:
            with self._lock:
                self._traces_started += 1
                self.collector.lifecycle(
                    "openai_agents.trace.started", status="running", **_trace_attributes(trace),
                )

        self._safe("on_trace_start", emit)

    def on_trace_end(self, trace: Any) -> None:
        def emit() -> None:
            with self._lock:
                self.collector.lifecycle(
                    "openai_agents.trace.completed", status="completed", **_trace_attributes(trace),
                )

        self._safe("on_trace_end", emit)

    def on_span_start(self, _span: Any) -> None:
        # Complete payloads are available only when the span has ended.
        return None

    def on_span_end(self, span: Any) -> None:
        def emit() -> None:
            with self._lock:
                span_id = _identifier(_value(span, "span_id"), f"span-{id(span)}")
                if span_id in self._ended_spans:
                    return
                self._ended_spans.add(span_id)
                self._map_completed_span(span)

        self._safe("on_span_end", emit)

    def _map_completed_span(self, span: Any) -> None:
        data = _value(span, "span_data")
        attributes = _span_attributes(span)
        if isinstance(data, FunctionSpanData):
            self._map_function(span, data, attributes)
        elif isinstance(data, GenerationSpanData):
            self._map_assistant_output(data.output, "generation", attributes)
        elif isinstance(data, ResponseSpanData):
            self._map_assistant_output(_value(data.response, "output"), "response", attributes)
        elif isinstance(data, AgentSpanData):
            self.collector.lifecycle(
                "openai_agents.agent.completed",
                status="completed",
                agent_name=data.name,
                handoffs=data.handoffs or [],
                tools=data.tools or [],
                output_type=data.output_type,
                agent_metadata=data.metadata or {},
                **attributes,
            )
        elif isinstance(data, HandoffSpanData):
            self.collector.lifecycle(
                "openai_agents.handoff.completed",
                status="completed",
                from_agent=data.from_agent,
                to_agent=data.to_agent,
                **attributes,
            )

    def _map_function(self, span: Any, data: FunctionSpanData, attributes: Mapping[str, Any]) -> None:
        # FunctionSpanData has no business tool_call_id. span_id is the only stable
        # per-invocation identifier exposed here, so it pairs this call/result; trace
        # and parent IDs remain attributes for topology rather than pretending to be IDs.
        call_id = _identifier(_value(span, "span_id"), f"span-{id(span)}")
        name = _identifier(data.name, "unknown_tool")
        self.collector.event(
            type="tool.call",
            source=self.source,
            data={"call_id": call_id, "name": name, "arguments": _arguments(data.input), "attributes": dict(attributes)},
        )
        error = _value(span, "error")
        self.collector.event(
            type="tool.result",
            source=self.source,
            data={
                "call_id": call_id,
                "name": name,
                "result": data.output,
                "is_error": bool(error),
                "status": "error" if error else "completed",
                "error": str(error) if error else None,
                "attributes": dict(attributes),
            },
        )
        missing = [field for field, value in (("input", data.input), ("output", data.output)) if value is None]
        if missing:
            self.collector.lifecycle(
                "openai_agents.payload.unavailable",
                status="degraded",
                span_kind="function",
                missing_fields=missing,
                reason="function span payload was empty or redacted",
                **dict(attributes),
            )

    def _map_assistant_output(self, output: Any, span_kind: str, attributes: Mapping[str, Any]) -> None:
        texts = _assistant_texts(output)
        if not texts:
            self.collector.lifecycle(
                "openai_agents.payload.unavailable",
                status="degraded",
                span_kind=span_kind,
                reason="span payload was empty or redacted",
                **dict(attributes),
            )
            return
        for text in texts:
            self.collector.event(
                type="message",
                source=self.source,
                data={"role": "assistant", "text": text, "attributes": dict(attributes)},
            )
            self.final_response = text

    def record_tracing_unavailable(self) -> None:
        """Record a ZDR/tracing-disabled fallback when no trace reached the router."""
        def emit() -> None:
            with self._lock:
                if self._traces_started or self._degradation_recorded:
                    return
                self._degradation_recorded = True
                self.collector.lifecycle(
                    "openai_agents.tracing.unavailable",
                    status="degraded",
                    reason="no tracing callbacks received; tracing may be disabled or unavailable under ZDR",
                )

        self._safe("tracing_unavailable", emit)

    def shutdown(self) -> None:
        return None

    def force_flush(self) -> None:
        return None


_active_processor: contextvars.ContextVar[OpenAIAgentsTracingProcessor | None] = contextvars.ContextVar(
    "agentbeat_openai_agents_processor", default=None,
)


class _TraceRouter(TracingProcessor):
    """Route globally delivered callbacks by trace ID without sharing collectors."""

    def __init__(self) -> None:
        self._routes: dict[str, OpenAIAgentsTracingProcessor] = {}
        self._lock = threading.RLock()

    def on_trace_start(self, trace: Any) -> None:
        processor = _active_processor.get()
        if processor is None:
            return
        trace_id = _identifier(_value(trace, "trace_id"), f"trace-{id(trace)}")
        with self._lock:
            self._routes[trace_id] = processor
        processor.on_trace_start(trace)

    def on_trace_end(self, trace: Any) -> None:
        trace_id = _identifier(_value(trace, "trace_id"), f"trace-{id(trace)}")
        with self._lock:
            processor = self._routes.pop(trace_id, None)
        if processor is not None:
            processor.on_trace_end(trace)

    def on_span_start(self, span: Any) -> None:
        processor = self._processor_for_span(span)
        if processor is not None:
            processor.on_span_start(span)

    def on_span_end(self, span: Any) -> None:
        processor = self._processor_for_span(span)
        if processor is not None:
            processor.on_span_end(span)

    def _processor_for_span(self, span: Any) -> OpenAIAgentsTracingProcessor | None:
        trace_id = _identifier(_value(span, "trace_id"), "trace-unavailable")
        with self._lock:
            return self._routes.get(trace_id)

    def forget(self, processor: OpenAIAgentsTracingProcessor) -> None:
        with self._lock:
            self._routes = {trace_id: routed for trace_id, routed in self._routes.items() if routed is not processor}

    def shutdown(self) -> None:
        with self._lock:
            self._routes.clear()

    def force_flush(self) -> None:
        return None


_router = _TraceRouter()
_router_registration_lock = threading.Lock()
_router_registered = False


def _ensure_router_registered() -> None:
    global _router_registered
    with _router_registration_lock:
        if not _router_registered:
            add_trace_processor(_router)
            _router_registered = True


@contextmanager
def observe_openai_agents_run(processor: OpenAIAgentsTracingProcessor) -> Iterator[OpenAIAgentsTracingProcessor]:
    """Register the lazy global router and bind ``processor`` to this Runner scope."""
    _ensure_router_registered()
    token = _active_processor.set(processor)
    try:
        yield processor
    finally:
        _active_processor.reset(token)
        _router.forget(processor)
        processor.record_tracing_unavailable()


__all__ = ["OpenAIAgentsTracingProcessor", "observe_openai_agents_run"]
