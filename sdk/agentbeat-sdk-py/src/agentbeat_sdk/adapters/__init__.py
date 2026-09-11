"""Framework adapters.

`LangGraphObserver` has no third-party import cost and stays eager. Every other
adapter imports its framework at module scope, so they resolve lazily through
`__getattr__`: importing this package must not require openai-agents, langchain
or opentelemetry to be installed. The canonical SDK core stays dependency-free
and each adapter's framework is pinned by the example that uses it.
"""

from typing import TYPE_CHECKING, Any

from .langgraph import LangGraphObserver

if TYPE_CHECKING:
    from .langchain import AsyncLangChainCallbackHandler, LangChainCallbackHandler
    from .openai_agents import OpenAIAgentsTracingProcessor, observe_openai_agents_run
    from .otel import ContentCaptureProbe, OTelGenAISpanProcessor

_LAZY = {
    "LangChainCallbackHandler": ("langchain", "langchain-core"),
    "AsyncLangChainCallbackHandler": ("langchain", "langchain-core"),
    "OpenAIAgentsTracingProcessor": ("openai_agents", "openai-agents"),
    "observe_openai_agents_run": ("openai_agents", "openai-agents"),
    "OTelGenAISpanProcessor": ("otel", "opentelemetry-sdk"),
    "ContentCaptureProbe": ("otel", "opentelemetry-sdk"),
}

__all__ = ["LangGraphObserver", *_LAZY]


def __getattr__(name: str) -> Any:
    try:
        module_name, distribution = _LAZY[name]
    except KeyError:
        raise AttributeError(f"module {__name__!r} has no attribute {name!r}") from None
    from importlib import import_module

    try:
        module = import_module(f".{module_name}", __name__)
    except ImportError as exc:
        raise ImportError(
            f"{name} requires the {distribution!r} package, which is not installed. "
            f"Install it in the deployment that uses this adapter."
        ) from exc
    return getattr(module, name)


def __dir__() -> list[str]:
    return sorted(__all__)
