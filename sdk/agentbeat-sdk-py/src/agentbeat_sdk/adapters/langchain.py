"""LangChain callback projection into target-evidence-v1."""

from __future__ import annotations

import json
import logging
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from langchain_core.callbacks.base import AsyncCallbackHandler, BaseCallbackHandler

from ..evidence import EvidenceCollector


logger = logging.getLogger(__name__)


def _key(run_id: Any) -> str:
    return str(run_id)


def _text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        parts: list[str] = []
        for item in value:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, Mapping) and isinstance(item.get("text"), str):
                parts.append(item["text"])
        return "".join(parts)
    return "" if value is None else str(value)


def _jsonish(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _arguments(input_str: str, inputs: Mapping[str, Any] | None) -> dict[str, Any]:
    if isinstance(inputs, Mapping):
        return dict(inputs)
    parsed = _jsonish(input_str or "")
    if isinstance(parsed, Mapping):
        return dict(parsed)
    return {} if parsed == "" else {"input": parsed}


def _name(serialized: Mapping[str, Any] | None, fallback: Any = None) -> str:
    value: Any = fallback
    if isinstance(serialized, Mapping):
        value = serialized.get("name") or value
        identifier = serialized.get("id")
        if not value and isinstance(identifier, (list, tuple)) and identifier:
            value = identifier[-1]
        elif not value and identifier:
            value = identifier
    text = str(value or "unknown")
    return text[:256] or "unknown"


def _attrs(
    *,
    run_id: Any,
    parent_run_id: Any = None,
    tags: list[str] | None = None,
    metadata: Mapping[str, Any] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    value: dict[str, Any] = {"framework": "langchain", "langchain_run_id": _key(run_id)}
    if parent_run_id is not None:
        value["langchain_parent_run_id"] = _key(parent_run_id)
    if tags:
        value["tags"] = list(tags)
    if isinstance(metadata, Mapping) and metadata:
        value["metadata"] = dict(metadata)
    value.update({key: item for key, item in extra.items() if item is not None})
    return value


def _message_text(value: Any) -> str:
    content = getattr(value, "content", None)
    if content is not None:
        return _text(content)
    if isinstance(value, Mapping):
        for key in ("final_response", "output", "text", "content"):
            if key in value:
                return _text(value[key])
    return value if isinstance(value, str) else ""


def _response_texts(response: Any) -> list[str]:
    texts: list[str] = []
    for batch in getattr(response, "generations", []) or []:
        for generation in batch if isinstance(batch, (list, tuple)) else [batch]:
            message = getattr(generation, "message", None)
            text = _message_text(message) if message is not None else _text(getattr(generation, "text", ""))
            if text:
                texts.append(text)
    return texts


@dataclass
class _ToolRun:
    call_id: str
    name: str
    attributes: dict[str, Any]


class _Mapper:
    def __init__(self, collector: EvidenceCollector, *, source: str, call_id_prefix: str) -> None:
        self.collector = collector
        self.source = source
        self.call_id_prefix = call_id_prefix
        self.final_response = ""
        self.active_tools: dict[str, _ToolRun] = {}
        self.tool_attempts: dict[str, int] = {}
        self.llm_runs: dict[str, dict[str, Any]] = {}
        self.emitted_llm_generations: set[str] = set()

    def emit(self, event_type: str, data: Mapping[str, Any]) -> bool:
        try:
            self.collector.event(type=event_type, source=self.source, data=data)
            return True
        except Exception:
            logger.exception("LangChain evidence mapping failed during %s", event_type)
            return False

    def chain_start(self, serialized: Mapping[str, Any] | None, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: Mapping[str, Any] | None = None, name: Any = None) -> None:
        if parent_run_id is None:
            self.emit("lifecycle", {"name": "langchain.chain.started", "status": "running", "attributes": _attrs(run_id=run_id, tags=tags, metadata=metadata, runnable_name=_name(serialized, name or "chain")[:128])})

    def chain_end(self, outputs: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None) -> None:
        if parent_run_id is not None:
            return
        text = _message_text(outputs)
        if text:
            self.final_response = text
        self.emit("lifecycle", {"name": "langchain.chain.completed", "status": "completed", "attributes": _attrs(run_id=run_id, tags=tags)})

    def chain_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None) -> None:
        if parent_run_id is None:
            self.emit("lifecycle", {"name": "langchain.chain.error", "status": "error", "attributes": _attrs(run_id=run_id, error=str(error))})

    def llm_start(self, serialized: Mapping[str, Any] | None, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: Mapping[str, Any] | None = None, name: Any = None) -> None:
        self.llm_runs[_key(run_id)] = _attrs(run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, model_name=_name(serialized, name or "llm"))

    def llm_end(self, response: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None) -> None:
        run_key = _key(run_id)
        base = self.llm_runs.pop(run_key, None) or _attrs(run_id=run_id, parent_run_id=parent_run_id, tags=tags)
        for index, text in enumerate(_response_texts(response)):
            identity = f"{run_key}:{index}"
            if identity in self.emitted_llm_generations:
                continue
            self.emitted_llm_generations.add(identity)
            if self.emit("message", {"role": "assistant", "text": text, "attributes": {**base, "generation_index": index}}):
                self.final_response = text

    def llm_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None) -> None:
        attributes = self.llm_runs.pop(_key(run_id), None) or _attrs(run_id=run_id, parent_run_id=parent_run_id)
        self.emit("run.error", {"message": str(error), "attributes": attributes})

    def tool_start(self, serialized: Mapping[str, Any] | None, input_str: str, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: Mapping[str, Any] | None = None, inputs: Mapping[str, Any] | None = None, name: Any = None, tool_call_id: Any = None) -> None:
        run_key = _key(run_id)
        attempt = self.tool_attempts.get(run_key, 0) + 1
        self.tool_attempts[run_key] = attempt
        call_id = f"{self.call_id_prefix}{run_key}{'' if attempt == 1 else f':{attempt}'}"
        tool_name = _name(serialized, name or "tool")
        attributes = _attrs(run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, framework_tool_call_id=str(tool_call_id) if tool_call_id else None)
        if self.emit("tool.call", {"call_id": call_id, "name": tool_name, "arguments": _arguments(input_str, inputs), "attributes": attributes}):
            self.active_tools[run_key] = _ToolRun(call_id, tool_name, attributes)

    def tool_end(self, output: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None) -> None:
        tool_run = self.active_tools.pop(_key(run_id), None)
        if tool_run is not None:
            attributes = {**tool_run.attributes, **_attrs(run_id=run_id, parent_run_id=parent_run_id, tags=tags)}
            self.emit("tool.result", {"call_id": tool_run.call_id, "name": tool_run.name, "result": _jsonish(output), "is_error": False, "status": "success", "attributes": attributes})

    def tool_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None) -> None:
        tool_run = self.active_tools.pop(_key(run_id), None)
        if tool_run is not None:
            attributes = {**tool_run.attributes, **_attrs(run_id=run_id, parent_run_id=parent_run_id, tags=tags)}
            self.emit("tool.result", {"call_id": tool_run.call_id, "name": tool_run.name, "result": str(error), "is_error": True, "status": "error", "error": str(error), "attributes": attributes})


class _HandlerMixin:
    def _init_mapper(self, collector: EvidenceCollector, *, source: str, call_id_prefix: str) -> None:
        self.collector = collector
        self.source = source
        self._mapper = _Mapper(collector, source=source, call_id_prefix=call_id_prefix)

    @property
    def final_response(self) -> str:
        return self._mapper.final_response

    def _safe(self, method: str, *args: Any, **kwargs: Any) -> None:
        try:
            getattr(self._mapper, method)(*args, **kwargs)
        except Exception:
            logger.exception("LangChain evidence mapping failed during %s", method)
            return


class LangChainCallbackHandler(_HandlerMixin, BaseCallbackHandler):
    """Synchronous LangChain callback handler for AgentBeat Evidence."""

    raise_error = False

    def __init__(self, collector: EvidenceCollector, *, source: str = "langchain", call_id_prefix: str = "langchain-tool:") -> None:
        super().__init__()
        self._init_mapper(collector, source=source, call_id_prefix=call_id_prefix)

    def on_chain_start(self, serialized: dict[str, Any], inputs: dict[str, Any], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("chain_start", serialized, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, name=kwargs.get("name"))

    def on_chain_end(self, outputs: dict[str, Any], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("chain_end", outputs, run_id=run_id, parent_run_id=parent_run_id, tags=tags)

    def on_chain_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, **kwargs: Any) -> None:
        self._safe("chain_error", error, run_id=run_id, parent_run_id=parent_run_id)

    def on_llm_start(self, serialized: dict[str, Any], prompts: list[str], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("llm_start", serialized, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, name=kwargs.get("name"))

    def on_chat_model_start(self, serialized: dict[str, Any], messages: list[list[Any]], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("llm_start", serialized, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, name=kwargs.get("name"))

    def on_llm_end(self, response: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("llm_end", response, run_id=run_id, parent_run_id=parent_run_id, tags=tags)

    def on_llm_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, **kwargs: Any) -> None:
        self._safe("llm_error", error, run_id=run_id, parent_run_id=parent_run_id)

    def on_tool_start(self, serialized: dict[str, Any], input_str: str, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, inputs: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("tool_start", serialized, input_str, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, inputs=inputs, name=kwargs.get("name"), tool_call_id=kwargs.get("tool_call_id"))

    def on_tool_end(self, output: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("tool_end", output, run_id=run_id, parent_run_id=parent_run_id, tags=tags)

    def on_tool_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("tool_error", error, run_id=run_id, parent_run_id=parent_run_id, tags=tags)


class AsyncLangChainCallbackHandler(_HandlerMixin, AsyncCallbackHandler):
    """Async LangChain callback handler with the same mapping as the sync handler."""

    raise_error = False

    def __init__(self, collector: EvidenceCollector, *, source: str = "langchain", call_id_prefix: str = "langchain-tool:") -> None:
        super().__init__()
        self._init_mapper(collector, source=source, call_id_prefix=call_id_prefix)

    async def on_chain_start(self, serialized: dict[str, Any], inputs: dict[str, Any], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("chain_start", serialized, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, name=kwargs.get("name"))

    async def on_chain_end(self, outputs: dict[str, Any], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("chain_end", outputs, run_id=run_id, parent_run_id=parent_run_id, tags=tags)

    async def on_chain_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, **kwargs: Any) -> None:
        self._safe("chain_error", error, run_id=run_id, parent_run_id=parent_run_id)

    async def on_llm_start(self, serialized: dict[str, Any], prompts: list[str], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("llm_start", serialized, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, name=kwargs.get("name"))

    async def on_chat_model_start(self, serialized: dict[str, Any], messages: list[list[Any]], *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("llm_start", serialized, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, name=kwargs.get("name"))

    async def on_llm_end(self, response: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("llm_end", response, run_id=run_id, parent_run_id=parent_run_id, tags=tags)

    async def on_llm_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, **kwargs: Any) -> None:
        self._safe("llm_error", error, run_id=run_id, parent_run_id=parent_run_id)

    async def on_tool_start(self, serialized: dict[str, Any], input_str: str, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, metadata: dict[str, Any] | None = None, inputs: dict[str, Any] | None = None, **kwargs: Any) -> None:
        self._safe("tool_start", serialized, input_str, run_id=run_id, parent_run_id=parent_run_id, tags=tags, metadata=metadata, inputs=inputs, name=kwargs.get("name"), tool_call_id=kwargs.get("tool_call_id"))

    async def on_tool_end(self, output: Any, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("tool_end", output, run_id=run_id, parent_run_id=parent_run_id, tags=tags)

    async def on_tool_error(self, error: BaseException, *, run_id: Any, parent_run_id: Any = None, tags: list[str] | None = None, **kwargs: Any) -> None:
        self._safe("tool_error", error, run_id=run_id, parent_run_id=parent_run_id, tags=tags)


__all__ = ["LangChainCallbackHandler", "AsyncLangChainCallbackHandler"]
