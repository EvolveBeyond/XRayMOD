"""
IOP Middleware for XRayMOD Backend.

Detects intent and runs processors before/after request handling.
"""
from __future__ import annotations

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from .intent import detect_intent, get_processors, Intent


class IOPMiddleware(BaseHTTPMiddleware):
    """
    IOP middleware — detects request intent and runs processors.

    Usage:
        app.add_middleware(IOPMiddleware)
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 1. Detect intent
        intent = detect_intent(request)
        request.state.intent = intent

        # 2. Run before-processors
        for processor in get_processors(intent.type):
            if hasattr(processor, 'before'):
                await processor.before(intent, request)

        # 3. Process request
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        # 4. Run after-processors (logging, metrics, etc.)
        for processor in get_processors(intent.type):
            if hasattr(processor, 'after'):
                await processor.after(intent, request, response, duration)

        # 5. Add intent headers for debugging
        response.headers["X-Intent-Type"] = intent.type.value
        response.headers["X-Intent-Resource"] = intent.resource

        return response


# ── Built-in Processors ──────────────────────────────────────
class LoggingProcessor:
    """Logs request intent and duration."""

    async def after(self, intent: Intent, request: Request, response: Response, duration: float):
        print(f"[{intent.type.value}] {request.method} {request.url.path} → {response.status_code} ({duration:.3f}s)")


class MetricsProcessor:
    """Tracks request metrics by intent type."""

    def __init__(self):
        self.metrics: dict[str, int] = {}

    async def after(self, intent: Intent, request: Request, response: Response, duration: float):
        key = f"{intent.type.value}:{response.status_code}"
        self.metrics[key] = self.metrics.get(key, 0) + 1


# Register built-in processors
from .intent import IntentType, register_processor

register_processor(IntentType.AUTH, LoggingProcessor())
register_processor(IntentType.USER_MANAGEMENT, LoggingProcessor())
register_processor(IntentType.NODE_MANAGEMENT, LoggingProcessor())
register_processor(IntentType.CONFIG_MANAGEMENT, LoggingProcessor())
register_processor(IntentType.PROTOCOL_MANAGEMENT, LoggingProcessor())
register_processor(IntentType.SETTINGS, LoggingProcessor())
register_processor(IntentType.CLEAN_IP, LoggingProcessor())
register_processor(IntentType.BACKEND, LoggingProcessor())
register_processor(IntentType.WIZARD, LoggingProcessor())
register_processor(IntentType.HEALTH, LoggingProcessor())
