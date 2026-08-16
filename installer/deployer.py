"""Deploy logic for XRayMOD panel.

NOTE: This module is superseded by installer/cli_deploy.py (the production
path used by install.sh / install.ps1 / install.cmd). It is retained because
installer/pipeline.py and the legacy GUI (installer/app.py) still import
``fetch_worker_code`` / ``generate_password``. Deploying through this module
is not the supported flow; prefer cli_deploy.main() for new installs.

The cf_api functions used here take a CFClient and a caller-supplied
authoritative account_id. If you touch this module, keep that contract —
never pass a raw token where a CFClient is required.
"""
from __future__ import annotations

import secrets
import subprocess
from pathlib import Path

import httpx

from . import cf_api
from .config import load, save, get_cache_path

# Fallback: published obfuscated worker (when local bundle unavailable)
WORKER_BUNDLE_URL = "https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/README.md"
REPO_ROOT = Path(__file__).resolve().parent.parent


def fetch_worker_code() -> str:
    """Prefer local build (worker.js or wrangler dry-run), else remote bundle."""
    local_worker = REPO_ROOT / "worker.js"
    if local_worker.exists() and local_worker.stat().st_size > 1000:
        return local_worker.read_text()

    # Try wrangler dry-run bundle
    try:
        outdir = get_cache_path("wrangler-bundle")
        outdir.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            ["npx", "wrangler", "deploy", "--dry-run", f"--outdir={outdir}"],
            cwd=REPO_ROOT,
            check=True,
            capture_output=True,
            timeout=120,
        )
        bundled = outdir / "index.js"
        if bundled.exists():
            return bundled.read_text()
    except Exception:
        pass

    cached = get_cache_path("xraymod-worker.js")
    if cached.exists():
        return cached.read_text()

    resp = httpx.get(WORKER_BUNDLE_URL, timeout=30, follow_redirects=True)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to download XRayMOD worker: HTTP {resp.status_code}")

    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_text(resp.text)
    return resp.text


def generate_password(length: int = 16) -> str:
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
    return "".join(secrets.choice(chars) for _ in range(length))


def deploy_cf(token: str, worker_name: str, d1_name: str, admin_password: str,
              account_id: str | None = None) -> dict:
    """Deploy to a Cloudflare account.

    ``account_id`` is authoritative when provided; it is never re-discovered
    inside this function (the first-account shortcut is not used).
    """
    account = cf_api.verify_token(token, account_id=account_id)
    account_id = account["id"]
    assert account_id, "account_id must not be empty"

    cf = cf_api.CFClient(token)
    d1 = cf_api.create_d1(cf, account_id, d1_name)
    d1_id = d1["id"]
    worker_code = fetch_worker_code()
    cf_api.deploy_worker(cf, account_id, worker_name, worker_code, d1_id)
    cf_api.enable_subdomain(cf, account_id, worker_name)
    worker_url = cf_api.get_worker_url(cf, account_id, worker_name)

    # Never persist Cloudflare API tokens on disk
    save({
        "worker_name": worker_name,
        "d1_name": d1_name,
        "d1_id": d1_id,
        "worker_url": worker_url,
        "account_id": account_id,
        "mode": "cloudflare",
    })

    return {
        "worker_name": worker_name,
        "worker_url": worker_url,
        "d1_database": d1_name,
        "d1_id": d1_id,
        "admin_password": admin_password,
        "account_name": account["name"],
    }


def deploy_server(host: str, port: int = 22, password: str = "") -> dict:
    """Deploy to a personal VPS via SSH."""
    # Phase 2: implement SSH-based deployment
    raise NotImplementedError("VPS deployment will be implemented in Phase 2")