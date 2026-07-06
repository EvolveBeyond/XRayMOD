# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
XrayMOD Installer — Stage 2 (Python / uv)
Deploys the XrayMOD panel to a Cloudflare account via OAuth (no API token needed).

Usage (called by install.sh):
    uv run install.py
"""

from __future__ import annotations

import hashlib
import json
import secrets
import sys
import threading
import webbrowser
from base64 import urlsafe_b64encode
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlencode, urlparse

import httpx

CF_API = "https://api.cloudflare.com/client/v4"
PANEL_GITHUB = "https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/refs/heads/main"

# OAuth settings — these are the app's own Cloudflare OAuth credentials
OAUTH_CLIENT_ID = "eb14e6bc5d43ef8a0f4a549e6f03b690"
OAUTH_AUTH_URL = "https://dash.cloudflare.com/oauth2/auth"
OAUTH_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token"
OAUTH_SCOPES = [
    "account:read",
    "user:read",
    "workers:write",
    "workers_kv:write",
    "workers_scripts:write",
    "d1:write",
]
OAUTH_REDIRECT_PORT = 18976

# ── OAuth State ──────────────────────────────────────────────

_oauth_state: str = ""
_oauth_code_verifier: str = ""
_oauth_result: dict = {}
_oauth_event = threading.Event()


def _gen_state() -> str:
    return urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")


def _gen_verifier() -> str:
    return urlsafe_b64encode(secrets.token_bytes(33)).decode().rstrip("=")


def _gen_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode()).digest()
    return urlsafe_b64encode(digest).decode().rstrip("=")


# ── OAuth Callback Server ────────────────────────────────────

class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global _oauth_result
        parsed = urlparse(self.path)

        if parsed.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return

        params = parse_qs(parsed.query)
        code = params.get("code", [None])[0]
        state = params.get("state", [None])[0]
        error = params.get("error", [None])[0]

        if error:
            _oauth_result = {"ok": False, "error": error}
            html = self._page("Authorization Failed", f"Error: {error}", False)
        elif not code or state != _oauth_state:
            _oauth_result = {"ok": False, "error": "Invalid state"}
            html = self._page("Authorization Failed", "Invalid state parameter", False)
        else:
            try:
                token_data = _exchange_code(code)
                _oauth_result = {"ok": True, "token": token_data["access_token"]}
                html = self._page("Connected", "You can close this tab and return to the terminal.", True)
            except Exception as e:
                _oauth_result = {"ok": False, "error": str(e)}
                html = self._page("Authorization Failed", str(e), False)

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(html.encode())

        _oauth_event.set()

    def _page(self, title: str, message: str, success: bool) -> str:
        color = "#10b981" if success else "#ef4444"
        icon = "✓" if success else "✗"
        return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ margin:0; background:#09090b; color:#fafafa; font-family:system-ui,sans-serif;
       display:grid; place-items:center; min-height:100vh; }}
.box {{ text-align:center; padding:3rem; max-width:400px; }}
.icon {{ font-size:3rem; margin-bottom:1rem; color:{color}; }}
h1 {{ font-size:1.5rem; margin:0 0 0.5rem; }}
p {{ color:#a1a1aa; margin:0; }}
</style></head><body>
<div class="box">
  <div class="icon">{icon}</div>
  <h1>{title}</h1>
  <p>{message}</p>
</div></body></html>"""

    def log_message(self, *args):
        pass


def _start_oauth_server() -> HTTPServer:
    server = HTTPServer(("127.0.0.1", OAUTH_REDIRECT_PORT), OAuthCallbackHandler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def _exchange_code(code: str) -> dict:
    data = urlencode({
        "client_id": OAUTH_CLIENT_ID,
        "code": code,
        "code_verifier": _oauth_code_verifier,
        "redirect_uri": f"http://localhost:{OAUTH_REDIRECT_PORT}/callback",
        "grant_type": "authorization_code",
    }).encode()

    resp = httpx.post(OAUTH_TOKEN_URL, content=data, headers={
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }, timeout=30)

    result = resp.json()
    if not result.get("access_token"):
        desc = result.get("error_description", result.get("error", "Unknown error"))
        raise RuntimeError(f"Token exchange failed: {desc}")
    return result


# ── Helpers ──────────────────────────────────────────────────

def _cf(token: str, path: str, method: str = "GET", body: dict | None = None) -> dict:
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    resp = httpx.request(method, f"{CF_API}{path}", headers=headers, json=body, timeout=30)
    data = resp.json()
    if not data.get("success"):
        errors = [e.get("message", str(e)) for e in data.get("errors", [])]
        raise RuntimeError(f"Cloudflare API: {'; '.join(errors) or resp.text}")
    return data


def _input(prompt: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    val = input(f"  {prompt}{suffix}: ").strip()
    return val or default


def _generate_password(length: int = 16) -> str:
    chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%"
    return "".join(secrets.choice(chars) for _ in range(length))


# ── Fetch panel code from GitHub ─────────────────────────────

def fetch_panel_code() -> str:
    url = f"{PANEL_GITHUB}/worker/index.ts"
    print("  Downloading panel code...")
    resp = httpx.get(url, timeout=30, follow_redirects=True)
    if resp.status_code != 200:
        raise RuntimeError(f"Failed to download panel code: HTTP {resp.status_code}")
    print(f"  ✓ Panel code downloaded ({len(resp.text)} bytes)")
    return resp.text


# ── Deploy ───────────────────────────────────────────────────

def deploy(token: str, worker_name: str, d1_name: str, admin_password: str) -> dict:
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

    boundary = f"----formdata-{secrets.token_hex(8)}"
    parts = []
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="metadata"\r\n'
        f"Content-Type: application/json\r\n\r\n"
        f"{json.dumps(metadata)}\r\n"
    )
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n'
        f"Content-Type: application/javascript+module\r\n\r\n"
        f"{panel_code}\r\n"
    )
    parts.append(f"--{boundary}--\r\n")
    body = "".join(parts).encode()

    resp = httpx.put(
        f"{CF_API}/accounts/{account_id}/workers/scripts/{worker_name}",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
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
        print("  ⚠ Subdomain enablement pending")

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
    global _oauth_state, _oauth_code_verifier

    print()
    print("╔══════════════════════════════════════╗")
    print("║       XrayMOD Cloudflare Deployer    ║")
    print("╚══════════════════════════════════════╝")
    print()
    print("This will deploy the XrayMOD panel to your Cloudflare account.")
    print("You'll be asked to authorize via Cloudflare — no API token needed.")
    print()

    # Start OAuth server
    server = _start_oauth_server()

    # Generate PKCE values
    _oauth_state = _gen_state()
    _oauth_code_verifier = _gen_verifier()
    challenge = _gen_challenge(_oauth_code_verifier)

    # Build OAuth URL
    auth_url = OAUTH_AUTH_URL + "?" + urlencode({
        "client_id": OAUTH_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": f"http://localhost:{OAUTH_REDIRECT_PORT}/callback",
        "scope": " ".join(OAUTH_SCOPES),
        "state": _oauth_state,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
    })

    # Open browser
    print("  Opening Cloudflare authorization page...")
    print(f"  If the browser doesn't open, visit:\n  {auth_url}\n")
    webbrowser.open(auth_url)

    # Wait for callback
    print("  Waiting for authorization...")
    _oauth_event.wait(timeout=120)
    server.shutdown()

    if not _oauth_result.get("ok"):
        print(f"\n❌ Authorization failed: {_oauth_result.get('error', 'Unknown error')}")
        sys.exit(1)

    token = _oauth_result["token"]
    print("  ✓ Authorized successfully!\n")

    # Get config
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
