"""Best-effort OpenTelemetry GenAI SpanProcessor fallback.

This is a long-tail degradation channel, not a first-class adapter. It only
projects spans that already follow the GenAI semantic conventions, and it never
installs a global TracerProvider or takes over exporters.

GenAI conventions used here are still Development: attribute names may break.
See GENAI_SEMCONV_* below for the snapshot this mapper was written against.
"""

from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from typing import Any, Mapping

from opentelemetry.sdk.trace import ReadableSpan, SpanProcessor
from opentelemetry.trace import StatusCode

from ..evidence import EvidenceCollector


logger = logging.getLogger(__name__)

# Snapshot of open-telemetry/semantic-conventions-genai (Development).
# Facts recorded 2026-09-03 from docs/gen-ai/gen-ai-agent-spans.md and
# reference/reports/{execute-tool,inference}-span.md. Upgrade this block
# together when the convention breaks.
GENAI_SEMCONV_REPOSITORY = "open-telemetry/semantic-conventions-genai"
GENAI_SEMCONV_STATUS = "development"
GENAI_SEMCONV_DOC = "docs/gen-ai/gen-ai-agent-spans.md"
GENAI_SEMCONV_SNAPSHOT = "2026-09-03"

ATTR_OPERATION_NAME = "gen_ai.operation.name"
ATTR_TOOL_NAME = "gen_ai.tool.name"
ATTR_TOOL_CALL_ID = "gen_ai.tool.call.id"
ATTR_TOOL_CALL_ARGUMENTS = "gen_ai.tool.call.arguments"
ATTR_TOOL_CALL_RESULT = "gen_ai.tool.call.result"
ATTR_INPUT_MESSAGES = "gen_ai.input.messages"
ATTR_OUTPUT_MESSAGES = "gen_ai.output.messages"
ATTR_AGENT_NAME = "gen_ai.agent.name"

OP_EXECUTE_TOOL = "execute_tool"
OP_INVOKE_AGENT = "invoke_agent"
INFERENCE_OPERATIONS = frozenset({"chat", "generate_content", "text_completion"})

_MISSING = object()
_bound_collector: ContextVar[EvidenceCollector | None] = ContextVar(
    "agentbeat_otel_collector", default=None,
)


def _attributes(span: ReadableSpan) -> Mapping[str, Any]:
    values = getattr(span, "attributes", None)
    return values if isinstance(values, Mapping) else {}


def _attr(attrs: Mapping[str, Any], key: str) -> Any:
    if key not in attrs:
        return _MISSING
    value = attrs[key]
    return _MISSING if value is None else value


def _parse_json(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _span_id(span: ReadableSpan) -> str:
    context = getattr(span, "context", None)
    span_id = getattr(context, "span_id", 0) if context is not None else 0
    return format(int(span_id or 0), "016x")


def _is_error(span: ReadableSpan) -> bool:
    status = getattr(span, "status", None)
    return getattr(status, "status_code", None) == StatusCode.ERROR


def _assistant_text(value: Any) -> str:
    parsed = _parse_json(value)
    if isinstance(parsed, Mapping):
        parsed = [parsed]
    if not isinstance(parsed, list):
        return _text_from_part(parsed)
    parts: list[str] = []
    for item in parsed:
        if not isinstance(item, Mapping):
            text = _text_from_part(item)
            if text:
                parts.append(text)
            continue
        role = str(item.get("role") or "")
        if role and role not in {"assistant", "model", "ai"}:
            continue
        text = _text_from_part(item.get("content"))
        if not text:
            text = _text_from_parts(item.get("parts"))
        if text:
            parts.append(text)
    return "".join(parts)


def _text_from_parts(parts: Any) -> str:
    if not isinstance(parts, list):
        return _text_from_part(parts)
    return "".join(_text_from_part(part) for part in parts)


def _text_from_part(part: Any) -> str:
    if isinstance(part, str):
        return part
    if isinstance(part, Mapping):
        if part.get("type") in {None, "text", "output_text"} and isinstance(part.get("content"), str):
            return part["content"]
        if isinstance(part.get("text"), str):
            return part["text"]
    return ""


def _capture_status(missing: list[str], relevant: tuple[str, ...]) -> str:
    if not missing:
        return "captured"
    if set(missing) >= set(relevant):
        return "missing"
    return "partial"


class ContentCaptureProbe:
    """Records whether Opt-In GenAI payload fields actually appeared on spans."""

    def __init__(self) -> None:
        self.tool_spans = 0
        self.tool_spans_with_arguments = 0
        self.tool_spans_with_result = 0
        self.inference_spans = 0
        self.inference_spans_with_output = 0
        self.agent_spans = 0

    def observe_tool(self, *, has_arguments: bool, has_result: bool) -> None:
        self.tool_spans += 1
        self.tool_spans_with_arguments += int(has_arguments)
        self.tool_spans_with_result += int(has_result)

    def observe_inference(self, *, has_output: bool) -> None:
        self.inference_spans += 1
        self.inference_spans_with_output += int(has_output)

    def observe_agent(self) -> None:
        self.agent_spans += 1

    @property
    def content_capture(self) -> str:
        relevant = self.tool_spans + self.inference_spans
        if relevant == 0:
            return "unknown"
        captured = self.tool_spans_with_arguments + self.tool_spans_with_result + self.inference_spans_with_output
        expected = self.tool_spans * 2 + self.inference_spans
        if captured == 0:
            return "missing"
        if captured < expected:
            return "partial"
        return "captured"

    def report(self) -> dict[str, Any]:
        status = self.content_capture
        warning = None
        if status in {"missing", "partial"}:
            warning = (
                "GenAI content-capture looks disabled or incomplete: tool arguments/"
                "results and input/output messages are Opt-In and were missing on "
                "some spans. AgentBeat will not invent that payload. Enabling "
                "content-capture sends sensitive content to every exporter on the "
                "same TracerProvider; AgentBeat redaction cannot govern those exporters."
            )
        elif status == "unknown":
            warning = "No execute_tool/chat spans observed yet; content-capture cannot be judged."
        return {
            "status": status,
            "semconv_repository": GENAI_SEMCONV_REPOSITORY,
            "semconv_status": GENAI_SEMCONV_STATUS,
            "semconv_snapshot": GENAI_SEMCONV_SNAPSHOT,
            "tool_spans": self.tool_spans,
            "tool_spans_with_arguments": self.tool_spans_with_arguments,
            "tool_spans_with_result": self.tool_spans_with_result,
            "inference_spans": self.inference_spans,
            "inference_spans_with_output": self.inference_spans_with_output,
            "agent_spans": self.agent_spans,
            "warning": warning,
        }


class OTelGenAISpanProcessor(SpanProcessor):
    """Consumes GenAI spans from a caller-owned TracerProvider.

    Register this processor on a provider the deployment already configured.
    Do not call `trace.set_tracer_provider` from this module.
    """

    def __init__(self, collector: EvidenceCollector | None = None, *, source: str = "otel-genai") -> None:
        self.collector = collector
        self.source = source
        self.probe = ContentCaptureProbe()
        self.final_response = ""
        self._closed = False

    def bind(self, collector: EvidenceCollector | None):
        return _bound_collector.set(collector)

    def unbind(self, token) -> None:
        _bound_collector.reset(token)

    def content_capture_report(self) -> dict[str, Any]:
        return self.probe.report()

    def on_start(self, span, parent_context=None) -> None:  # noqa: ARG002 - OTel contract
        return None

    def on_end(self, span: ReadableSpan) -> None:
        if self._closed:
            return
        try:
            self._project(span)
        except Exception:
            logger.exception("OTel GenAI evidence mapping failed")
            return

    def shutdown(self) -> None:
        self._closed = True

    def force_flush(self, timeout_millis: int = 30000) -> bool:  # noqa: ARG002 - OTel contract
        return not self._closed

    def _active_collector(self) -> EvidenceCollector | None:
        bound = _bound_collector.get()
        return bound if bound is not None else self.collector

    def _project(self, span: ReadableSpan) -> None:
        attrs = _attributes(span)
        operation = _attr(attrs, ATTR_OPERATION_NAME)
        if operation is _MISSING:
            return
        operation_name = str(operation)
        if operation_name not in {OP_EXECUTE_TOOL, OP_INVOKE_AGENT, *INFERENCE_OPERATIONS}:
            return
        collector = self._active_collector()
        if collector is None:
            logger.warning(
                "OTel GenAI span ended without an active EvidenceCollector; "
                "bind() must cover span end, and ContextVar bindings do not cross threads "
                "(span=%s, operation=%s)",
                getattr(span, "name", "") or "",
                operation_name,
            )
            return
        if operation_name == OP_EXECUTE_TOOL:
            self._project_tool(collector, span, attrs)
            return
        if operation_name in INFERENCE_OPERATIONS:
            self._project_inference(collector, span, attrs, operation_name)
            return
        if operation_name == OP_INVOKE_AGENT:
            self._project_agent(collector, span, attrs)

    def _event_attributes(self, span: ReadableSpan, operation: str, missing: list[str], relevant: tuple[str, ...]) -> dict[str, Any]:
        capture = _capture_status(missing, relevant)
        attributes: dict[str, Any] = {
            "otel.adapter": "best-effort",
            "otel.semconv_status": GENAI_SEMCONV_STATUS,
            "otel.semconv_snapshot": GENAI_SEMCONV_SNAPSHOT,
            "otel.operation": operation,
            "otel.span_name": getattr(span, "name", "") or "",
            "otel.content_capture": capture,
            "otel.degraded": capture != "captured",
        }
        if missing:
            attributes["otel.missing_opt_in_fields"] = list(missing)
        return attributes

    def _project_tool(self, collector: EvidenceCollector, span: ReadableSpan, attrs: Mapping[str, Any]) -> None:
        name = _attr(attrs, ATTR_TOOL_NAME)
        if name is _MISSING or not str(name).strip():
            return
        tool_name = str(name)
        raw_id = _attr(attrs, ATTR_TOOL_CALL_ID)
        call_id = str(raw_id) if raw_id is not _MISSING and str(raw_id) else _span_id(span)
        raw_args = _attr(attrs, ATTR_TOOL_CALL_ARGUMENTS)
        raw_result = _attr(attrs, ATTR_TOOL_CALL_RESULT)
        has_arguments = raw_args is not _MISSING
        has_result = raw_result is not _MISSING
        self.probe.observe_tool(has_arguments=has_arguments, has_result=has_result)

        missing: list[str] = []
        arguments: dict[str, Any] = {}
        if not has_arguments:
            missing.append(ATTR_TOOL_CALL_ARGUMENTS)
        else:
            parsed = _parse_json(raw_args)
            arguments = dict(parsed) if isinstance(parsed, Mapping) else {"_unparsed": parsed}

        result: Any = None
        if not has_result:
            missing.append(ATTR_TOOL_CALL_RESULT)
        else:
            result = _parse_json(raw_result)

        attributes = self._event_attributes(
            span, OP_EXECUTE_TOOL, missing, (ATTR_TOOL_CALL_ARGUMENTS, ATTR_TOOL_CALL_RESULT),
        )
        if raw_id is _MISSING:
            attributes["otel.call_id_source"] = "span_id"
        collector.event(
            type="tool.call",
            source=self.source,
            data={"call_id": call_id, "name": tool_name, "arguments": arguments, "attributes": attributes},
        )
        result_data: dict[str, Any] = {
            "call_id": call_id,
            "name": tool_name,
            "result": result,
            "is_error": _is_error(span),
            "attributes": attributes,
        }
        if _is_error(span):
            result_data["status"] = "error"
        collector.event(type="tool.result", source=self.source, data=result_data)

    def _project_inference(
        self, collector: EvidenceCollector, span: ReadableSpan, attrs: Mapping[str, Any], operation: str,
    ) -> None:
        raw_output = _attr(attrs, ATTR_OUTPUT_MESSAGES)
        raw_input = _attr(attrs, ATTR_INPUT_MESSAGES)
        has_output = raw_output is not _MISSING
        self.probe.observe_inference(has_output=has_output)
        missing: list[str] = []
        if raw_input is _MISSING:
            missing.append(ATTR_INPUT_MESSAGES)
        if not has_output:
            missing.append(ATTR_OUTPUT_MESSAGES)
        text = _assistant_text(raw_output) if has_output else ""
        if not text.strip():
            return
        attributes = self._event_attributes(
            span, operation, missing, (ATTR_INPUT_MESSAGES, ATTR_OUTPUT_MESSAGES),
        )
        collector.event(
            type="message",
            source=self.source,
            data={"role": "assistant", "text": text, "attributes": attributes},
        )
        self.final_response = text

    def _project_agent(self, collector: EvidenceCollector, span: ReadableSpan, attrs: Mapping[str, Any]) -> None:
        self.probe.observe_agent()
        attributes = self._event_attributes(span, OP_INVOKE_AGENT, [], ())
        agent_name = _attr(attrs, ATTR_AGENT_NAME)
        if agent_name is not _MISSING:
            attributes["otel.agent_name"] = str(agent_name)
        collector.event(
            type="lifecycle",
            source=self.source,
            data={
                "name": "invoke_agent",
                "status": "error" if _is_error(span) else "completed",
                "attributes": attributes,
            },
        )
