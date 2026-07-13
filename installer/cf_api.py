"""Cloudflare API client with OAuth2 PKCE and resource management."""
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

OAUTH_CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7"
OAUTH_AUTH_URL = "https://dash.cloudflare.com/oauth2/auth"
OAUTH_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token"
OAUTH_SCOPES = [
    "account:read", "user:read", "workers:write", "workers_kv:write",
    "workers_scripts:write", "d1:write", "pages:write", "pages:read", "zone:read",
]
OAUTH_REDIRECT_PORT = 8976
OAUTH_REDIRECT_URI = f"http://localhost:{OAUTH_REDIRECT_PORT}/oauth/callback"

_oauth_state = ""
_oauth_code_verifier = ""
_oauth_result: dict = {}
_oauth_event = threading.Event()


class CFApiError(Exception):
    pass


def _gen_state() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(32)).decode().rstrip("=")


def _gen_verifier() -> str:
    return base64.urlsafe_b64encode(secrets.token_bytes(33)).decode().rstrip("=")


def _gen_challenge(verifier: str) -> str:
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("=")


def get_oauth_url() -> str:
    global _oauth_state, _oauth_code_verifier
    _oauth_state = _gen_state()
    _oauth_code_verifier = _gen_verifier()
    params = urlencode({
        "client_id": OAUTH_CLIENT_ID, "response_type": "code",
        "redirect_uri": OAUTH_REDIRECT_URI, "scope": " ".join(OAUTH_SCOPES),
        "state": _oauth_state, "code_challenge": _gen_challenge(_oauth_code_verifier),
        "code_challenge_method": "S256",
    })
    return f"{OAUTH_AUTH_URL}?{params}"


def _exchange_token(code: str, verifier: str) -> dict:
    data = urlencode({
        "client_id": OAUTH_CLIENT_ID, "code": code, "code_verifier": verifier,
        "redirect_uri": OAUTH_REDIRECT_URI, "grant_type": "authorization_code",
    }).encode()
    resp = httpx.post(OAUTH_TOKEN_URL, content=data,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        timeout=30)
    result = resp.json()
    if "access_token" not in result:
        raise CFApiError(f"Token exchange failed: {result.get('error_description', result.get('error', str(result)))}")
    return result


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
                msg, icon = f"Error: {error}", "&#10060;"
            elif not code or state != _oauth_state:
                _oauth_result = {"ok": False, "error": "Invalid state"}
                msg, icon = "Invalid state", "&#10060;"
            else:
                try:
                    t = _exchange_token(code, _oauth_code_verifier)
                    _oauth_result = {"ok": True, "access_token": t["access_token"], "refresh_token": t.get("refresh_token", "")}
                    msg, icon = "Connected! Close this tab.", "&#9989;"
                except CFApiError as e:
                    _oauth_result = {"ok": False, "error": str(e)}
                    msg, icon = str(e), "&#10060;"
            ok = _oauth_result.get("ok", False)
            html = f'<!DOCTYPE html><html><head><meta charset="utf-8"><title>XRayMOD OAuth</title>'
            html += '<style>body{margin:0;background:#09090b;color:#fafafa;font-family:system-ui;display:grid;place-items:center;min-height:100vh}'
            html += '.box{text-align:center;padding:2rem;max-width:400px}'
            html += '.icon{width:48px;height:48px;border-radius:12px;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.5rem}'
            html += f'.icon.{"ok" if ok else "err"}{{background:{"#10b981" if ok else "#ef4444"};color:{"#000" if ok else "#fff"}}}'
            html += '</style></head><body><div class="box">'
            html += f'<div class="icon {"ok" if ok else "err"}">{icon}</div>'
            html += f'<h1>{"Connected" if ok else "Error"}</h1>'
            html += f'<p style="color:#a1a1aa;margin-top:1rem">{msg}</p>'
            html += '<p style="color:#52525b;margin-top:1rem;font-size:.875rem">Return to installer.</p>'
            html += '</div></body></html>'
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(html.encode())
            _oauth_event.set()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *a):
        pass


def start_oauth_server():
    s = ThreadingHTTPServer(("127.0.0.1", OAUTH_REDIRECT_PORT), OAuthCallbackHandler)
    threading.Thread(target=s.serve_forever, daemon=True).start()


def wait_for_oauth(timeout: int = 300) -> dict:
    _oauth_event.wait(timeout=timeout)
    return _oauth_result


# ── CF API Client ────────────────────────────────────────────
class CFClient:
    def __init__(self, token: str, timeout: int = 70):
        self.token = token
        self.timeout = timeout

    def req(self, method: str, path: str, json_body: dict | None = None,
            data: bytes | None = None, content_type: str | None = None,
            accept_404: bool = False) -> dict:
        url = f"{CF_API}{path}"
        headers = {"Authorization": f"Bearer {self.token}", "Accept": "application/json"}
        if json_body:
            data = json.dumps(json_body, separators=(",", ":")).encode()
            headers["Content-Type"] = "application/json"
        elif content_type:
            headers["Content-Type"] = content_type

        logger.debug(f"CF {method} {url}")
        try:
            resp = httpx.request(method, url, headers=headers, content=data, timeout=self.timeout)
        except httpx.TimeoutException:
            raise CFApiError("Cloudflare API timeout")
        except httpx.RequestError as e:
            raise CFApiError(f"Connection error: {e}")

        try:
            result = resp.json()
        except json.JSONDecodeError:
            raise CFApiError(f"Invalid response: {resp.text[:100]}")

        if resp.status_code == 404 and accept_404:
            return {"success": True, "result": None}

        if not result.get("success"):
            errors = [e.get("message", str(e)) for e in result.get("errors", [])]
            raise CFApiError(f"CF API: {'; '.join(errors)}")
        return result


def verify_token(token: str) -> dict:
    cf = CFClient(token)
    data = cf.req("GET", "/accounts?per_page=1")
    a = data["result"][0]
    return {"id": a["id"], "name": a["name"]}


def create_d1(cf: CFClient, account_id: str, name: str) -> dict:
    logger.info(f"Creating D1: {name}")
    try:
        data = cf.req("GET", f"/accounts/{account_id}/d1/database?name={name}")
        for r in (data.get("result") or []):
            return {"id": r.get("uuid") or r.get("id"), "name": name, "reused": True}
    except CFApiError:
        pass
    data = cf.req("POST", f"/accounts/{account_id}/d1/database", json_body={"name": name})
    r = data.get("result") or {}
    return {"id": r.get("uuid") or r.get("id"), "name": name, "reused": False}


def get_subdomain(cf: CFClient, account_id: str) -> str:
    try:
        data = cf.req("GET", f"/accounts/{account_id}/workers/subdomain")
        r = data.get("result") or {}
        s = r.get("subdomain") or r.get("name")
        if s:
            return s
    except CFApiError:
        pass
    name = f"xraymod-{secrets.token_hex(4)}"
    for m in ("PUT", "POST", "PATCH"):
        try:
            cf.req(m, f"/accounts/{account_id}/workers/subdomain", json_body={"subdomain": name})
            return name
        except CFApiError:
            continue
    raise CFApiError("Could not set workers.dev subdomain")


def enable_subdomain(cf: CFClient, account_id: str, worker_name: str):
    for m in ("POST", "PUT", "PATCH"):
        try:
            cf.req(m, f"/accounts/{account_id}/workers/scripts/{worker_name}/subdomain", json_body={"enabled": True})
            return
        except CFApiError:
            continue


def get_worker_settings(cf: CFClient, account_id: str, worker_name: str) -> dict | None:
    """Read existing worker settings to preserve bindings on update."""
    try:
        return cf.req("GET", f"/accounts/{account_id}/workers/scripts/{worker_name}/settings")
    except CFApiError:
        return None


def deploy_worker(cf: CFClient, account_id: str, worker_name: str, worker_code: str,
                  d1_id: str) -> str:
    """Deploy XRayMOD worker.js with D1 binding only. Password set via /install page."""
    logger.info(f"Deploying worker: {worker_name}")

    # Check if worker already exists — preserve bindings
    existing = get_worker_settings(cf, account_id, worker_name)
    if existing and existing.get("result"):
        settings = existing["result"]
        metadata = {}
        for field in ["main_module", "compatibility_date", "compatibility_flags",
                      "bindings", "migrations", "usage_model", "limits", "placement"]:
            if settings.get(field) is not None:
                metadata[field] = settings[field]
        if not metadata.get("main_module"):
            metadata["main_module"] = "worker.js"
        if not metadata.get("compatibility_date"):
            metadata["compatibility_date"] = "2024-09-23"
        if not metadata.get("compatibility_flags"):
            metadata["compatibility_flags"] = ["nodejs_compat"]
        bindings = metadata.get("bindings", [])
        db_found = any(b.get("name") == "DB" for b in bindings)
        if not db_found and d1_id:
            bindings.append({"type": "d1", "name": "DB", "database_id": d1_id})
        metadata["bindings"] = bindings
        logger.info(f"Updating existing worker, preserving {len(bindings)} bindings")
    else:
        metadata = {
            "main_module": "worker.js",
            "compatibility_date": "2024-09-23",
            "compatibility_flags": ["nodejs_compat"],
            "bindings": [
                {"type": "d1", "name": "DB", "database_id": d1_id},
            ],
        }

    boundary = f"----formdata-{secrets.token_hex(8)}"
    parts = [
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"metadata\"\r\nContent-Type: application/json\r\n\r\n"
        f"{json.dumps(metadata, separators=(',', ':'))}\r\n",
        f"--{boundary}\r\nContent-Disposition: form-data; name=\"worker.js\"; filename=\"worker.js\"\r\n"
        f"Content-Type: application/javascript+module\r\n\r\n{worker_code}\r\n",
        f"--{boundary}--\r\n",
    ]
    body = "".join(parts).encode()
    cf.req("PUT", f"/accounts/{account_id}/workers/scripts/{worker_name}",
           data=body, content_type=f"multipart/form-data; boundary={boundary}")
    logger.info(f"Worker deployed: {worker_name}")
    return worker_name


def get_worker_url(cf: CFClient, account_id: str, worker_name: str) -> str:
    subdomain = get_subdomain(cf, account_id)
    return f"https://{worker_name}.{subdomain}.workers.dev"


def get_worker_account(token: str) -> tuple[str, str]:
    cf = CFClient(token)
    data = cf.req("GET", "/accounts?per_page=1")
    a = data["result"][0]
    return a["id"], a["name"]


def list_workers(cf: CFClient, account_id: str) -> list[dict]:
    try:
        data = cf.req("GET", f"/accounts/{account_id}/workers/scripts?per_page=50")
        return data.get("result") or []
    except CFApiError:
        return []


def list_d1_databases(cf: CFClient, account_id: str) -> list[dict]:
    try:
        data = cf.req("GET", f"/accounts/{account_id}/d1/database?per_page=50")
        return data.get("result") or []
    except CFApiError:
        return []


def delete_worker(cf: CFClient, account_id: str, worker_name: str):
    logger.info(f"Deleting worker: {worker_name}")
    cf.req("DELETE", f"/accounts/{account_id}/workers/scripts/{worker_name}", accept_404=True)
    logger.info(f"Worker deleted: {worker_name}")


def delete_d1(cf: CFClient, account_id: str, d1_id: str):
    logger.info(f"Deleting D1: {d1_id}")
    cf.req("DELETE", f"/accounts/{account_id}/d1/database/{d1_id}", accept_404=True)
    logger.info(f"D1 deleted: {d1_id}")


def deploy_frontend(cf: CFClient, account_id: str, project_name: str, static_dir: Path):
    """Deploy frontend to Cloudflare Pages."""
    import tarfile
    import tempfile

    # Create tarball of .next/static
    with tempfile.NamedTemporaryFile(suffix='.tar.gz', delete=False) as tmp:
        with tarfile.open(tmp.name, 'w:gz') as tar:
            for f in static_dir.rglob('*'):
                if f.is_file():
                    tar.add(f, arcname=f.relative_to(static_dir.parent.parent))
        tar_path = tmp.name

    try:
        # Upload to Pages
        with open(tar_path, 'rb') as f:
            cf.req("POST", f"/accounts/{account_id}/pages/projects/{project_name}/deployments",
                   data=f.read(), content_type="application/gzip")
        logger.info(f"Frontend deployed to Pages: {project_name}")
    except CFApiError:
        # Project might not exist, create it
        cf.req("POST", f"/accounts/{account_id}/pages/projects",
               json_body={"name": project_name, "production_branch": "main"})
        with open(tar_path, 'rb') as f:
            cf.req("POST", f"/accounts/{account_id}/pages/projects/{project_name}/deployments",
                   data=f.read(), content_type="application/gzip")
        logger.info(f"Frontend Pages project created and deployed: {project_name}")
