"""
IOP Intent detection for XRayMOD Backend.

Detects request intent and routes to appropriate processors.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Callable

from fastapi import Request


class IntentType(str, Enum):
    """Request intent types."""
    AUTH = "auth"
    USER_MANAGEMENT = "user_management"
    NODE_MANAGEMENT = "node_management"
    CONFIG_MANAGEMENT = "config_management"
    PROTOCOL_MANAGEMENT = "protocol_management"
    SETTINGS = "settings"
    CLEAN_IP = "clean_ip"
    BACKEND = "backend"
    WIZARD = "wizard"
    HEALTH = "health"
    UNKNOWN = "unknown"


class Intent:
    """Request intent — carries purpose data."""
    def __init__(self, intent_type: IntentType, resource: str = "", action: str = ""):
        self.type = intent_type
        self.resource = resource
        self.action = action

    def __repr__(self) -> str:
        return f"Intent(type={self.type.value}, resource={self.resource}, action={self.action})"


# ── Intent Detection ─────────────────────────────────────────
INTENT_MAP: dict[str, IntentType] = {
    "/api/login": IntentType.AUTH,
    "/api/logout": IntentType.AUTH,
    "/api/users": IntentType.USER_MANAGEMENT,
    "/api/nodes": IntentType.NODE_MANAGEMENT,
    "/api/configs": IntentType.CONFIG_MANAGEMENT,
    "/api/protocols": IntentType.PROTOCOL_MANAGEMENT,
    "/api/settings": IntentType.SETTINGS,
    "/api/cleanip": IntentType.CLEAN_IP,
    "/api/backends": IntentType.BACKEND,
    "/api/wizard": IntentType.WIZARD,
    "/api/health": IntentType.HEALTH,
}


def detect_intent(request: Request) -> Intent:
    """Detect intent from request path."""
    path = request.url.path

    for prefix, intent_type in INTENT_MAP.items():
        if path.startswith(prefix):
            resource = path.split("/")[2] if len(path.split("/")) > 2 else ""
            action = path.split("/")[3] if len(path.split("/")) > 3 else ""
            return Intent(intent_type, resource, action)

    return Intent(IntentType.UNKNOWN, path)


# ── Processor Registry ───────────────────────────────────────
Processor = Callable[[Intent, Request, dict], Any]

_processor_registry: dict[IntentType, list[Processor]] = {t: [] for t in IntentType}


def register_processor(intent_type: IntentType, processor: Processor):
    """Register a processor for an intent type."""
    _processor_registry[intent_type].append(processor)


def get_processors(intent_type: IntentType) -> list[Processor]:
    """Get all processors for an intent type."""
    return _processor_registry[intent_type]
