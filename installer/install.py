# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
XrayMOD Installer — Stage 2 (Python / uv)
Deploys the XrayMOD panel to a Cloudflare account using the Cloudflare API.

Usage (called by install.sh):
    uv run install.py
"""

from __future__ import annotations

import base64
import json
import secrets
import sys
import textwrap
from urllib.parse import quote

import httpx

CF_API = "https://api.cloudflare.com/client/v4"
PANEL_GITHUB = "https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/refs/heads/main"

# ── Helpers ──────────────────────────────────────────────────

def _cf(token: str, path: str, method: str = "GET", body: dict | None = None) -> dict:
    """Make a Cloudflare API request."""
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    resp = httpx.request(method, f"{CF_API}{path}", headers=headers, json=body, timeout=30)
    data = resp.json()
    if not data.get("success"):
        errors = [e.get("message", str(e)) for e in data.get("errors", [])]
        raise RuntimeError(f"Cloudflare API: {'; '.join(errors) or resp.text}")
    return data


def _input(prompt: str, default: str = "") -> str:
    """Read input with optional default."""
    suffix = f" [{default}]" if default else ""
    val = input(f"  {prompt}{suffix}: ").strip()
    return val or default


def _generate_password(length: int = 16) -> str:
    """Generate a random admin password."""
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
    return "".join(secrets.choice(chars) for _ in range(length))


# ── Fetch panel code from GitHub ─────────────────────────────

def fetch_panel_code() -> str:
    """Download the bundled worker script from GitHub."""
    url = f"{PANEL_GITHUB}/worker/index.ts"
    print(f"  Downloading panel code...")
    resp = httpx.get(url, timeout=30, follow_redirects=True)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to download panel code: HTTP {resp.status_code}")
    print(f"  ✓ Panel code downloaded ({len(resp.text)} bytes)")
    return resp.text


# ── Deploy ───────────────────────────────────────────────────

def deploy(
    token: str,
    worker_name: str,
    d1_name: str,
    admin_password: str,
) -> dict:
    """Deploy XrayMOD panel to a Cloudflare account."""

    # Step 1: Get account ID
    print("\n[1/5] Finding Cloudflare account...")
    accounts = _cf(token, "/accounts?per_page=1")
    account = accounts["result"][0]
    account_id = account["id"]
    print(f"  ✓ Account: {account['name']} ({account_id})")

    # Step 2: Create D1 database
    print("\n[2/5] Creating D1 database...")
    try:
        d1 = _cf(token, f"/accounts/{account_id}/d1/database", "POST", {"name": d1_name})
        d1_id = d1["result"]["id"]
        print(f"  ✓ Database created: {d1_name} ({d1_id})")
    except RuntimeError:
        # Try to find existing
        existing = _cf(token, f"/accounts/{account_id}/d1/database?name={d1_name}")
        if existing.get("result"):
            d1_id = existing["result"][0]["uuid"]
            print(f"  ✓ Database found: {d1_name} ({d1_id})")
        else:
            raise

    # Step 3: Fetch panel code
    print("\n[3/5] Fetching panel code...")
    panel_code = fetch_panel_code()

    # Step 4: Upload worker
    print("\n[4/5] Uploading worker...")
    metadata = {
        "main_module": "worker.js",
        "compatibility_date": "2025-01-01",
        "compatibility_flags": ["nodejs_compat"],
        "bindings": [
            {"type": "d1", "name": "DB", "database_id": d1_id},
            {"type": "plain_text", "name": "ADMIN_PASSWORD", "text": admin_password},
        ],
    }

    # Build multipart form
    boundary = f"----formdata-{secrets.token_hex(8)}"
    parts = []

    # Metadata part
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="metadata"\r\n'
        f"Content-Type: application/json\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
    )

    # Worker script part
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n'
        f"Content-Type: application/javascript+module\r\n\r\n"
        f"{panel_code}\r\n"
    )

    parts.append(f"--{boundary}--\r\n")
    body = "".join(parts).encode()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": f"multipart/form-data; boundary={boundary}",
    }

    resp = httpx.put(
        f"{CF_API}/accounts/{account_id}/workers/scripts/{worker_name}",
        headers=headers,
        content=body,
        timeout=60,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Worker upload failed: {resp.text}")

    print(f"  ✓ Worker uploaded: {worker_name}")

    # Step 5: Enable workers.dev subdomain
    print("\n[5/5] Enabling workers.dev subdomain...")
    try:
        _cf(token, f"/accounts/{account_id}/workers/scripts/{worker_name}/subdomain", "PUT", {"enabled": True})
    except RuntimeError:
        print("  ⚠ Subdomain enablement will be available shortly")

    # Get subdomain
    subdomain = "workers.dev"
    try:
        sub = _cf(token, f"/accounts/{account_id}/workers/subdomain")
        subdomain = sub["result"].get("subdomain", "workers.dev")
    except RuntimeError:
        pass

    worker_url = f"https://{worker_name}.{subdomain}"

    return {
        "worker_name": worker_name,
        "worker_url": worker_url,
        "d1_database": d1_name,
        "d1_id": d1_id,
        "admin_password": admin_password,
    }


# ── Main ─────────────────────────────────────────────────────

def main() -> None:
    print()
    print("╔══════════════════════════════════════╗")
    print("║       XrayMOD Cloudflare Deployer    ║")
    print("╚══════════════════════════════════════╝")
    print()
    print("This will deploy the XrayMOD panel to your Cloudflare account.")
    print("You need a Cloudflare API token with these permissions:")
    print("  - Account: Workers Scripts: Edit")
    print("  - Account: D1: Edit")
    print()

    # Get inputs
    token = _input("Cloudflare API token")
    if not token:
        print("\nError: API token is required.")
        sys.exit(1)

    worker_name = _input("Worker name", f"xraymod-{secrets.token_hex(4)}")
    d1_name = _input("D1 database name", f"{worker_name}-db")
    admin_password = _input("Admin password (empty = auto-generate)", "")

    if not admin_password:
        admin_password = _generate_password()

    print()
    print(f"  Worker:    {worker_name}")
    print(f"  Database:  {d1_name}")
    print(f"  Password:  {admin_password}")
    print()

    confirm = input("  Deploy? [Y/n] ").strip().lower()
    if confirm and confirm != "y":
        print("Cancelled.")
        sys.exit(0)

    try:
        result = deploy(token, worker_name, d1_name, admin_password)
    except Exception as e:
        print(f"\n❌ Deployment failed: {e}")
        sys.exit(1)

    print()
    print("═══════════════════════════════════════")
    print("  ✅ Deployment successful!")
    print("═══════════════════════════════════════")
    print()
    print(f"  Panel URL:   {result['worker_url']}")
    print(f"  Admin user:  admin")
    print(f"  Admin pass:  {result['admin_password']}")
    print(f"  Database:    {result['d1_database']}")
    print()
    print("  Open the panel URL to get started.")
    print()


if __name__ == "__main__":
    main()
