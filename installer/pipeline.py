"""
IOP Pipeline for XRayMOD Installer.

Each step is an independent processor:
- Takes state dict as input
- Returns modified state dict
- Steps can be added/removed/reordered without touching others

Usage:
    result = run_pipeline(state, [verify_token, create_d1, deploy_worker])
"""
from __future__ import annotations

from typing import Callable

from . import cf_api
from .config import save
from .deployer import fetch_worker_code, generate_password


# ── State Type ───────────────────────────────────────────────
# Using plain dict (Level 1 IOP) — upgrade to TypedDict if needed


# ── Pipeline Runner ──────────────────────────────────────────
def run_pipeline(
    state: dict,
    steps: list[Callable[[dict], dict]],
) -> dict:
    """Run a pipeline of independent processors."""
    for step in steps:
        state = step(state)
    return state


# ── Independent Processors ───────────────────────────────────
# Each processor: state in → state out. No side effects in core.

def verify_token(state: dict) -> dict:
    """Step 1: Verify Cloudflare API token."""
    token = state.get("token", "").strip()
    if not token:
        return {**state, "error": "Token is required"}

    try:
        account = cf_api.verify_token(token)
        return {**state, "account": account, "account_id": account["id"]}
    except cf_api.CFApiError as e:
        return {**state, "error": str(e)}


def create_d1(state: dict) -> dict:
    """Step 2: Create D1 database."""
    if "error" in state:
        return state

    token = state["token"]
    account_id = state["account_id"]
    d1_name = state.get("d1_name", f"{state.get('worker_name', 'cf-worker')}-db")

    try:
        d1_id = cf_api.create_d1(token, account_id, d1_name)
        return {**state, "d1_id": d1_id, "d1_name": d1_name}
    except Exception as e:
        return {**state, "error": f"D1 creation failed: {e}"}


def fetch_code(state: dict) -> dict:
    """Step 3: Fetch worker code."""
    if "error" in state:
        return state

    try:
        worker_code = fetch_worker_code()
        return {**state, "worker_code": worker_code}
    except Exception as e:
        return {**state, "error": f"Code fetch failed: {e}"}


def deploy_worker(state: dict) -> dict:
    """Step 4: Deploy worker to Cloudflare."""
    if "error" in state:
        return state

    token = state["token"]
    account_id = state["account_id"]
    worker_name = state.get("worker_name", f"cf-{__import__('secrets').token_hex(6)}")
    d1_id = state["d1_id"]
    admin_password = state.get("admin_password") or generate_password()

    try:
        cf_api.deploy_worker(token, account_id, worker_name, state["worker_code"], d1_id, admin_password)
        cf_api.enable_worker_subdomain(token, account_id, worker_name)
        worker_url = cf_api.get_worker_url(token, account_id, worker_name)

        return {
            **state,
            "worker_name": worker_name,
            "worker_url": worker_url,
            "admin_password": admin_password,
        }
    except Exception as e:
        return {**state, "error": f"Deploy failed: {e}"}


def save_config(state: dict) -> dict:
    """Step 5: Save configuration locally."""
    if "error" in state:
        return state

    save({
        "api_token": state["token"],
        "worker_name": state["worker_name"],
        "d1_name": state["d1_name"],
        "d1_id": state["d1_id"],
        "worker_url": state["worker_url"],
        "mode": "cloudflare",
    })

    return {**state, "saved": True}


# ── Default Pipeline ─────────────────────────────────────────
DEFAULT_PIPELINE = [
    verify_token,
    create_d1,
    fetch_code,
    deploy_worker,
    save_config,
]


def deploy(token: str, worker_name: str = "", d1_name: str = "", admin_password: str = "") -> dict:
    """Run the full deployment pipeline."""
    initial_state = {
        "token": token,
        "worker_name": worker_name or f"cf-{__import__('secrets').token_hex(6)}",
        "d1_name": d1_name,
        "admin_password": admin_password,
    }

    result = run_pipeline(initial_state, DEFAULT_PIPELINE)

    if "error" in result:
        raise RuntimeError(result["error"])

    return {
        "worker_name": result["worker_name"],
        "worker_url": result["worker_url"],
        "d1_database": result["d1_name"],
        "d1_id": result["d1_id"],
        "admin_password": result["admin_password"],
        "account_name": result.get("account", {}).get("name", ""),
    }
