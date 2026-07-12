"""Cloudflare API client with OAuth2 PKCE support."""
from __future__ import annotations

import base64
import hashlib
import json
import logging
import secrets
import threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlencode, urlparse, parse_qs

import httpx

logger = logging.getLogger("xraymod.installer")

CF_API = "https://api.cloudflare.com/client/v4"

# ── OAuth2 Configuration ─────────────────────────────────────
OAUTH_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7"  # Cloudflare Workers OAuth app
OAUTH_AUTH_URL = "https://dash.cloudflare.com/oauth2/auth"
OAUTH_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token"
OAUTH_SCOPES = [
    "account:read",
    "user:read",
    "workers:write",
    "workers_kv:write",
    "workers_scripts:write",
    "d1:write",
    "pages:write",
    "pages:read",
    "zone:read",
]
OAUTH_REDIRECT_PORT = 8976
OAUTH_REDIRECT_URI = f"http://localhost:{OAUTH_REDIRECT_PORT}/oauth/callback"

# ── OAuth State ──────────────────────────────────────────────
_oauth_state = ""
_oauth_code_verifier = ""
_oauth_result: dict = {}
_oauth_event = threading.Event()


class CFApiError(Exception):
    pass


# ── OAuth2 PKCE Helpers ──────────────────────────────────────
def _gen_state() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")


def _gen_verifier() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(33)).decode().rstrip("=")


def _gen_challenge(verifier: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")


def get_oauth_url() -> str:
    """Generate OAuth2 authorization URL with PKCE."""
    global _oauth_state, _oauth_code_verifier
    _oauth_state = _gen_state()
    _oauth_code_verifier = _gen_verifier()
    params = urlencode({
        "client_id": OAUTH_CLIENT_ID,
        "response_type": "code",
        "redirect_uri": OAUTH_REDIRECT_URI,
        "scope": " ".join(OAUTH_SCOPES),
        "state": _oauth_state,
        "code_challenge": _gen_challenge(_oauth_code_verifier),
        "code_challenge_method": "S256",
    })
    return f"{OAUTH_AUTH_URL}?{params}"


def _exchange_token(code: str, verifier: str) -> dict:
    """Exchange authorization code for access token."""
    data = urlencode({
        "client_id": OAUTH_CLIENT_ID,
        "code": code,
        "code_verifier": verifier,
        "redirect_uri": OAUTH_REDIRECT_URI,
        "grant_type": "authorization_code",
    }).encode()

    resp = httpx.post(
        OAUTH_TOKEN_URL,
        content=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        timeout=30,
    )

    result = resp.json()
    if "access_token" not in result:
        error = result.get("error_description") or result.get("error") or str(result)
        raise CFApiError(f"Token exchange failed: {error}")

    return result


# ── OAuth Callback Server ────────────────────────────────────
class OAuthCallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global _oauth_result
        parsed = urlparse(self.path)

        if parsed.path == "/oauth/callback":
            params = parse_qs(parsed.query)
            code = params.get("code", [None])[0]
            state = params.get("state", [None])[0]
            error = params.get("error", [None])[0]

            if error:
                _oauth_result = {"ok": False, "error": f"Cloudflare: {error}"}
                msg = f"Error: {error}"
                icon = "&#10060;"
            elif not code or state != _oauth_state:
                _oauth_result = {"ok": False, "error": "Invalid state"}
                msg = "Invalid state parameter"
                icon = "&#10060;"
            else:
                try:
                    token_data = _exchange_token(code, _oauth_code_verifier)
                    _oauth_result = {
                        "ok": True,
                        "access_token": token_data["access_token"],
                        "refresh_token": token_data.get("refresh_token", ""),
                    }
                    msg = "Connected successfully! You can close this tab."
                    icon = "&#9989;"
                except CFApiError as e:
                    _oauth_result = {"ok": False, "error": str(e)}
                    msg = str(e)
                    icon = "&#10060;"

            html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>XRayMOD - OAuth</title>
<style>
body{{margin:0;background:#09090b;color:#fafafa;font-family:system-ui;display:grid;place-items:center;min-height:100vh}}
.box{{text-align:center;padding:2rem;max-width:400px}}
.icon{{width:48px;height:48px;border-radius:12px;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.5rem}}
.icon.ok{{background:#10b981;color:#000}}
.icon.err{{background:#ef4444;color:#fff}}
</style></head>
<body><div class="box">
<div class="icon {'ok' if 'ok' in _oauth_result and _oauth_result['ok'] else 'err'}">{icon}</div>
<h1>{'Connected' if 'ok' in _oauth_result and _oauth_result['ok'] else 'Error'}</h1>
<p style="color:#a1a1aa;margin-top:1rem">{msg}</p>
<p style="color:#52525b;margin-top:1rem;font-size:.875rem">You can close this tab and return to the installer.</p>
</div></body></html>"""

            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode())
            _oauth_event.set()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass  # Suppress logs


def start_oauth_server() -> None:
    """Start local OAuth callback server."""
    server = ThreadingHTTPServer(("127.0.0.1", OAUTH_REDIRECT_PORT), OAuthCallbackHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    logger.info(f"OAuth callback server started on port {OAUTH_REDIRECT_PORT}")


def wait_for_oauth(timeout: int = 300) -> dict:
    """Wait for OAuth callback and return result."""
    _oauth_event.wait(timeout=timeout)
    return _oauth_result


# ── Cloudflare API Client ────────────────────────────────────
class CFClient:
    """Cloudflare API client using OAuth token."""

    def __init__(self, token: str, timeout: int = 70):
        self.token = token
        self.timeout = timeout

    def req(self, method: str, path: str, json_body: dict | None = None,
            data: bytes | None = None, content_type: str | None = None,
            accept_404: bool = False) -> dict:
        """Make API request to Cloudflare."""
        url = f"{CF_API}{path}"
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
            "User-Agent": "xraymod-installer/2.0",
        }

        if json_body:
            data = json.dumps(json_body, separators=(",", ":")).encode()
            headers["Content-Type"] = "application/json"
        elif content_type:
            headers["Content-Type"] = content_type

        logger.debug(f"CF API {method} {url}")

        try:
            resp = httpx.request(method, url, headers=headers, content=data, timeout=self.timeout)
        except httpx.TimeoutException:
            raise CFApiError("Cloudflare API timeout — check your internet connection")
        except httpx.RequestError as e:
            raise CFApiError(f"Cloudflare API connection error: {e}")

        try:
            result = resp.json()
        except json.JSONDecodeError:
            raise CFApiError(f"Invalid response from Cloudflare: {resp.text[:100]}")

        if resp.status_code == 404 and accept_404:
            return {"success": True, "result": None}

        if not result.get("success"):
            errors = result.get("errors", [])
            error_msgs = [e.get("message", str(e)) for e in errors]
            raise CFApiError(f"Cloudflare API: {'; '.join(error_msgs)}")

        return result


# ── Resource Operations ──────────────────────────────────────
def verify_token(token: str) -> dict:
    """Verify token and return account info."""
    cf = CFClient(token)
    data = cf.req("GET", "/accounts?per_page=1")
    account = data["result"][0]
    return {"id": account["id"], "name": account["name"]}


def create_d1(cf: CFClient, account_id: str, name: str) -> dict:
    """Create D1 database or get existing."""
    logger.info(f"Creating D1 database: {name}")

    # Check if exists
    try:
        data = cf.req("GET", f"/accounts/{account_id}/d1/database?name={name}")
        results = data.get("result") or []
        if results:
            d1_id = results[0].get("uuid") or results[0].get("id")
            logger.info(f"Using existing D1: {d1_id}")
            return {"id": d1_id, "name": name, "reused": True}
    except CFApiError:
        pass

    # Create new
    data = cf.req("POST", f"/accounts/{account_id}/d1/database", json_body={"name": name})
    result = data.get("result") or {}
    d1_id = result.get("uuid") or result.get("id")
    logger.info(f"D1 created: {d1_id}")
    return {"id": d1_id, "name": name, "reused": False}


def get_subdomain(cf: CFClient, account_id: str) -> str:
    """Get workers.dev subdomain."""
    try:
        data = cf.req("GET", f"/accounts/{account_id}/workers/subdomain")
        result = data.get("result") or {}
        subdomain = result.get("subdomain") or result.get("name")
        if subdomain:
            return subdomain
    except CFApiError:
        pass

    # Try to set subdomain
    name = f"xraymod-{secrets.token_hex(4)}"
    for method in ("PUT", "POST", "PATCH"):
        try:
            cf.req(method, f"/accounts/{account_id}/workers/subdomain", json_body={"subdomain": name})
            return name
        except CFApiError:
            continue

    raise CFApiError("Could not set workers.dev subdomain")


def enable_subdomain(cf: CFClient, account_id: str, worker_name: str) -> None:
    """Enable workers.dev subdomain for worker."""
    for method in ("POST", "PUT", "PATCH"):
        try:
            cf.req(method, f"/accounts/{account_id}/workers/scripts/{worker_name}/subdomain", json_body={"enabled": True})
            return
        except CFApiError:
            continue


def deploy_worker(cf: CFClient, account_id: str, worker_name: str, worker_code: str,
                  d1_id: str, admin_password: str, pages_url: str = "") -> str:
    """Deploy worker script."""
    logger.info(f"Deploying worker: {worker_name}")

    metadata = {
        "main_module": "worker.js",
        "compatibility_date": "2025-01-01",
        "compatibility_flags": ["nodejs_compat"],
        "bindings": [
            {"type": "d1", "name": "DB", "database_id": d1_id},
            {"type": "plain_text", "name": "ADMIN_PASSWORD", "text": admin_password},
            {"type": "plain_text", "name": "PAGES_URL", "text": pages_url},
        ],
    }

    # Build multipart body
    boundary = f"----formdata-{secrets.token_hex(8)}"
    parts = []
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="metadata"\r\n'
        f"Content-Type: application/json\r\n\r\n"
        f"{json.dumps(metadata, separators=(',', ':'))}\r\n"
    )
    parts.append(
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="worker.js"; filename="worker.js"\r\n'
        f"Content-Type: application/javascript+module\r\n\r\n"
        f"{worker_code}\r\n"
    )
    parts.append(f"--{boundary}--\r\n")
    body = "".join(parts).encode()

    cf.req(
        "PUT",
        f"/accounts/{account_id}/workers/scripts/{worker_name}",
        data=body,
        content_type=f"multipart/form-data; boundary={boundary}",
    )

    logger.info(f"Worker deployed: {worker_name}")
    return worker_name


def get_worker_url(cf: CFClient, account_id: str, worker_name: str) -> str:
    """Get full worker URL."""
    subdomain = get_subdomain(cf, account_id)
    url = f"https://{worker_name}.{subdomain}.workers.dev"
    logger.info(f"Worker URL: {url}")
    return url
