#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
XrayMOD CLI Installer — interactive one-shot deploy.

Flow:
  1. Cloudflare API Token
  2. Verify account
  3. Admin username
  4. Admin password
  5. Deploy Worker + D1 + UI
  6. Bootstrap panel + print credentials
"""
from __future__ import annotations

import json
import os
import re
import secrets
import shutil
import subprocess
import sys
import time
from pathlib import Path

import httpx

# cf_api is a sibling module (installer/ dir is on sys.path when run as a script)
from cf_api import CFClient, CFApiError, create_d1, enable_subdomain, get_subdomain

CF_API = "https://api.cloudflare.com/client/v4"
SUPPORT_TG = "https://t.me/MRROBOT_DT"
REPO_ROOT = Path(__file__).resolve().parent.parent
CONFIG_DIR = Path.home() / ".xraymod"
CONFIG_FILE = CONFIG_DIR / "config.json"
IS_WIN = sys.platform == "win32"


def _enable_windows_console() -> None:
    """UTF-8 + ANSI colors on Windows consoles (CMD / PowerShell)."""
    if not IS_WIN:
        return
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)
    except Exception:
        pass


_enable_windows_console()

# Colors
G = "\033[0;32m"
Y = "\033[1;33m"
R = "\033[0;31m"
C = "\033[0;36m"
B = "\033[1m"
N = "\033[0m"
DIM = "\033[2m"


def banner() -> None:
    print(
        f"""
{G}╔══════════════════════════════════════════════════╗
║{B}   XrayMOD  ·  نصب خودکار اوپن‌سورس             {N}{G}║
║{DIM}   فقط ۳ ورودی: توکن → یوزر → رمز              {N}{G}║
║{DIM}   پشتیبانی: t.me/MRROBOT_DT                     {N}{G}║
╚══════════════════════════════════════════════════╝{N}
"""
    )


def ok(msg: str) -> None:
    print(f"  {G}✓{N} {msg}")


def info(msg: str) -> None:
    print(f"  {Y}→{N} {msg}")


def err(msg: str) -> None:
    print(f"  {R}✗{N} {msg}")


def ask(prompt: str, default: str = "", secret: bool = False) -> str:
    suffix = f" [{default}]" if default else ""
    try:
        if secret and sys.stdin.isatty():
            import getpass

            val = getpass.getpass(f"  {prompt}{suffix}: ")
        else:
            val = input(f"  {prompt}{suffix}: ")
    except (EOFError, KeyboardInterrupt):
        print()
        sys.exit(1)
    val = (val or "").strip()
    return val or default


def cf(token: str, path: str, method: str = "GET", body: dict | None = None) -> dict:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/json"
    r = httpx.request(
        method,
        f"{CF_API}{path}",
        headers=headers,
        json=body,
        timeout=60,
    )
    data = r.json()
    if not data.get("success"):
        errors = [e.get("message", str(e)) for e in data.get("errors", [])]
        raise RuntimeError("; ".join(errors) or r.text[:300])
    return data


def save_config(cfg: dict) -> None:
    """Persist local metadata only — never write API tokens or passwords to disk."""
    CONFIG_DIR.mkdir(parents=True, exist_ok=True)
    safe = {
        k: v
        for k, v in cfg.items()
        if k
        not in {
            "api_token",
            "token",
            "password",
            "admin_password",
            "CLOUDFLARE_API_TOKEN",
        }
        and not str(k).lower().endswith(("_token", "_secret", "_password", "_key"))
    }
    CONFIG_FILE.write_text(json.dumps(safe, indent=2, ensure_ascii=False))
    try:
        CONFIG_FILE.chmod(0o600)
    except Exception:
        pass


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            data = json.loads(CONFIG_FILE.read_text())
            # Drop any legacy secrets from older installer versions
            for k in list(data.keys()):
                if k in {"api_token", "token", "password", "admin_password"} or str(
                    k
                ).lower().endswith(("_token", "_secret", "_password", "_key")):
                    data.pop(k, None)
            return data
        except Exception:
            pass
    return {}


def _which(name: str) -> str | None:
    """Resolve executables on Windows (npm.cmd / npx.cmd / node.exe)."""
    found = shutil.which(name)
    if found:
        return found
    if IS_WIN:
        for ext in (".cmd", ".exe", ".bat"):
            found = shutil.which(name + ext)
            if found:
                return found
    return None


def ensure_tools() -> None:
    info("بررسی ابزارها...")
    if not _which("node"):
        err("Node.js لازم است: https://nodejs.org")
        sys.exit(1)
    if not _which("npm"):
        err("npm پیدا نشد")
        sys.exit(1)
    node = _which("node") or "node"
    ok(f"Node {subprocess.check_output([node, '-v'], text=True).strip()}")


def run(cmd: list[str], cwd: Path | None = None, env: dict | None = None) -> None:
    full_env = {**os.environ, **(env or {})}
    resolved = list(cmd)
    exe = _which(resolved[0])
    if exe:
        resolved[0] = exe
    # npm/npx are batch wrappers on Windows; shell=True is required for .cmd
    use_shell = IS_WIN and resolved[0].lower().endswith((".cmd", ".bat"))
    p = subprocess.run(
        resolved if not use_shell else subprocess.list2cmdline(resolved),
        cwd=str(cwd or REPO_ROOT),
        env=full_env,
        shell=use_shell,
    )
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")


def ensure_deps() -> None:
    info("نصب وابستگی‌ها (npm)...")
    if not (REPO_ROOT / "node_modules").exists():
        run(["npm", "install", "--no-fund", "--no-audit"])
    fe = REPO_ROOT / "frontend" / "node_modules"
    if not fe.exists():
        run(["npm", "install", "--prefix", "frontend", "--no-fund", "--no-audit"])
    ok("Dependencies آماده")


def build_ui() -> None:
    info("ساخت رابط کاربری...")
    run(["npm", "run", "build:ui"])
    if not (REPO_ROOT / "frontend" / "out" / "index.html").exists():
        raise RuntimeError("frontend/out ساخته نشد")
    ok("UI build شد")

def create_or_get_d1(token: str, account_id: str, name: str) -> str:
    """Idempotent D1 provisioning. account_id is authoritative — no re-discovery."""
    cf = CFClient(token)
    result = create_d1(cf, account_id, name)
    d1_id = result["id"]
    if not d1_id:
        raise RuntimeError(f"D1 provisioning returned no id: {result!r}")
    if result.get("reused"):
        ok(f"D1 موجود: {name}")
    else:
        ok(f"D1 ساخته شد: {name}")
    return d1_id


def ensure_workers_subdomain(token: str, account_id: str) -> str:
    """Get or create the account's workers.dev subdomain.

    Raises CFApiError (via cf_api.get_subdomain) on failure — never fabricates a
    fallback value like "workers". account_id is authoritative.
    """
    cf = CFClient(token)
    subdomain = get_subdomain(cf, account_id)
    if not subdomain:
        raise RuntimeError(f"workers.dev subdomain could not be resolved for account {account_id}")
    ok(f"workers.dev subdomain: {subdomain}")
    return subdomain


def write_wrangler(d1_id: str, worker_name: str) -> None:
    content = f'''name = "{worker_name}"
main = "worker/index.ts"
compatibility_date = "2024-11-01"
workers_dev = true
preview_urls = true

[assets]
directory = "./frontend/out"
binding = "ASSETS"
run_worker_first = true
not_found_handling = "none"

[[d1_databases]]
binding = "DB"
database_name = "xraymod-db"
database_id = "{d1_id}"
preview_database_id = "{d1_id}"

[vars]
EXTERNAL_SERVER_URL = ""
DISGUISE_PAGE = "404"
PANEL_RECOVERY = "false"
CRYPTO_KEY = ""
'''
    (REPO_ROOT / "wrangler.toml").write_text(content)
    ok("wrangler.toml به‌روز شد")


def deploy_worker(token: str, account_id: str, worker_name: str) -> str:
    """Deploy a worker and enable workers.dev subdomain.

    ``account_id`` is the authoritative account — it is not re-discovered
    inside the function. The returned URL is based on this account.
    """
    info("دیپلوی Worker...")
    env = {"CLOUDFLARE_API_TOKEN": token}
    # npx wrangler deploy
    run(["npx", "wrangler", "deploy"], env=env)

    # enable workers.dev on script
    try:
        cf = CFClient(token)
        cf.req("POST", f"/accounts/{account_id}/workers/scripts/{worker_name}/subdomain", json_body={"enabled": True, "previews_enabled": True})
    except CFApiError as exc:
        err(f"Subdomain enable failed: {exc}")
        raise RuntimeError(f"Subdomain enable failed: {exc}")

    # Ensure workers.dev subdomain
    subdomain = ensure_workers_subdomain(token, account_id)
    url = f"https://{worker_name}.{subdomain}.workers.dev"
    ok(f"Worker: {url}")
    return url


def _bootstrap_via_httpx(url: str, body: dict, verify: bool) -> dict:
    with httpx.Client(
        timeout=httpx.Timeout(60.0, connect=30.0),
        verify=verify,
        http2=False,
        follow_redirects=True,
        headers={
            "User-Agent": "XrayMOD-Installer/1.0",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    ) as client:
        r = client.post(url, json=body)
        return {"status": r.status_code, "text": r.text, "json": _safe_json(r.text)}


def _bootstrap_via_urllib(url: str, body: dict, verify: bool) -> dict:
    import ssl
    import urllib.error
    import urllib.request

    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "User-Agent": "XrayMOD-Installer/1.0",
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
    )
    ctx = ssl.create_default_context()
    if not verify:
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    try:
        # Prefer TLS 1.2+ when available (avoids some SSLv3 handshake failures)
        if hasattr(ssl, "TLSVersion"):
            ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    except Exception:
        pass
    try:
        with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
            text = resp.read().decode("utf-8", errors="replace")
            return {"status": resp.status, "text": text, "json": _safe_json(text)}
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace") if e.fp else str(e)
        return {"status": e.code, "text": text, "json": _safe_json(text)}


def _bootstrap_via_curl(url: str, body: dict, verify: bool) -> dict | None:
    curl = _which("curl")
    if not curl:
        return None
    cmd = [
        curl,
        "-sS",
        "-X",
        "POST",
        url,
        "-H",
        "Content-Type: application/json",
        "-H",
        "Accept: application/json",
        "-H",
        "User-Agent: XrayMOD-Installer/1.0",
        "--connect-timeout",
        "30",
        "--max-time",
        "60",
        "-d",
        json.dumps(body),
        "-w",
        "\n__HTTP_STATUS__:%{http_code}",
    ]
    if not verify:
        cmd.insert(1, "-k")
    p = subprocess.run(cmd, capture_output=True, text=True)
    out = (p.stdout or "") + (p.stderr or "")
    if p.returncode != 0 and "__HTTP_STATUS__:" not in out:
        raise RuntimeError(out.strip()[:300] or f"curl exit {p.returncode}")
    status = 0
    text = out
    if "__HTTP_STATUS__:" in out:
        text, _, tail = out.rpartition("__HTTP_STATUS__:")
        try:
            status = int(tail.strip().split()[0])
        except Exception:
            status = 0
        text = text.strip()
    return {"status": status, "text": text, "json": _safe_json(text)}


def _bootstrap_via_powershell(url: str, body: dict) -> dict | None:
    if not IS_WIN or not _which("powershell"):
        return None
    import base64

    # Windows PowerShell uses Schannel — often works when OpenSSL handshake fails
    b64 = base64.b64encode(json.dumps(body).encode("utf-8")).decode("ascii")
    ps = f"""
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
$raw = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('{b64}'))
try {{
  $r = Invoke-RestMethod -Uri '{url}' -Method Post -Body $raw -ContentType 'application/json; charset=utf-8' -TimeoutSec 60
  $r | ConvertTo-Json -Depth 10 -Compress
}} catch {{
  if ($_.Exception.Response) {{
    $resp = $_.Exception.Response
    $stream = $resp.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $reader.ReadToEnd()
  }} else {{
    throw $_.Exception.Message
  }}
}}
"""
    p = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
        capture_output=True,
        text=True,
    )
    text = (p.stdout or "").strip() or (p.stderr or "").strip()
    if p.returncode != 0 and not text:
        raise RuntimeError(f"powershell bootstrap failed ({p.returncode})")
    data = _safe_json(text)
    if data is None and p.returncode != 0:
        raise RuntimeError(text[:300])
    return {"status": 200 if data else 0, "text": text, "json": data}


def _safe_json(text: str) -> dict | None:
    try:
        val = json.loads(text)
        return val if isinstance(val, dict) else None
    except Exception:
        return None


def _post_install(worker_url: str, username: str, password: str) -> dict:
    """POST /install using several transports (SSL-friendly fallbacks)."""
    url = f"{worker_url.rstrip('/')}/install"
    body = {"username": username, "password": password, "auto": False}
    errors: list[str] = []

    transports = [
        ("httpx", lambda: _bootstrap_via_httpx(url, body, verify=True)),
        ("urllib", lambda: _bootstrap_via_urllib(url, body, verify=True)),
        ("curl", lambda: _bootstrap_via_curl(url, body, verify=True)),
        ("powershell", lambda: _bootstrap_via_powershell(url, body)),
        # Last resort: some networks/AV break cert chain to workers.dev
        ("httpx-insecure", lambda: _bootstrap_via_httpx(url, body, verify=False)),
        ("urllib-insecure", lambda: _bootstrap_via_urllib(url, body, verify=False)),
        ("curl-insecure", lambda: _bootstrap_via_curl(url, body, verify=False)),
    ]

    for name, fn in transports:
        try:
            result = fn()
            if result is None:
                continue
            data = result.get("json")
            if data and data.get("success"):
                if "insecure" in name:
                    info("اتصال با حالت سازگار SSL برقرار شد")
                return data
            if data and data.get("error"):
                # Logical API error (not transport) — stop early for some cases
                err_msg = str(data.get("error"))
                if "already" in err_msg.lower() or "configured" in err_msg.lower():
                    return data
                errors.append(f"{name}: {err_msg}")
                continue
            status = result.get("status") or 0
            snippet = (result.get("text") or "")[:160]
            errors.append(f"{name}: HTTP {status} {snippet}")
        except Exception as e:
            errors.append(f"{name}: {e}")
    raise RuntimeError(" | ".join(errors[-4:]) if errors else "no transport worked")


def verify_worker_url(worker_url: str, retries: int = 6, delay: float = 3.0) -> bool:
    """Verify the worker endpoint is reachable and returns a sane response.

    Distinguishes DNS/deploy lag (retriable) from a dead endpoint (abort).
    Lifted TLS verification is never used for this check — the URL must be
    genuinely reachable over valid TLS for the install to be considered done.
    """
    url = f"{worker_url.rstrip('/')}/api/health"
    for i in range(retries):
        try:
            with httpx.Client(timeout=httpx.Timeout(15.0, connect=10.0), verify=True, http2=False, follow_redirects=True) as client:
                r = client.get(url)
                if r.status_code in (200, 404, 401, 403):
                    # 404 can be the stealth 404 (disguise) — worker is up
                    return True
        except httpx.HTTPError:
            if i < retries - 1:
                info(f"تلاش {i + 1}/{retries} — منتظر edge/DNS...")
                time.sleep(delay + i * 1.5)
        except Exception:
            if i < retries - 1:
                time.sleep(delay)
    return False


def bootstrap_remote(worker_url: str, username: str, password: str, retries: int = 18) -> dict:
    info("راه‌اندازی پنل (bootstrap)...")
    info(f"هدف: {worker_url}/install")
    last_err = ""
    # workers.dev SSL / DNS can lag a bit after first deploy
    time.sleep(5)
    for i in range(retries):
        try:
            data = _post_install(worker_url, username, password)
            if data.get("success"):
                ok("پنل آماده شد")
                return data
            last_err = data.get("error") or json.dumps(data, ensure_ascii=False)[:200]
            # already installed — surface clearly
            if last_err and "already" in str(last_err).lower():
                raise RuntimeError(last_err)
        except Exception as e:
            last_err = str(e)
            if i == 0 or i % 3 == 0:
                info(f"تلاش {i + 1}/{retries} — منتظر edge/SSL...")
        time.sleep(min(2 + i * 0.4, 8))
    raise RuntimeError(
        f"Bootstrap failed: {last_err}\n"
        f"  Worker URL: {worker_url}\n"
        f"  اگر Worker در مرورگر باز می‌شود، یک‌بار دیگر نصب را بزن یا از VPN/شبکه دیگر امتحان کن."
    )


def print_success(data: dict, worker_url: str) -> None:
    print(
        f"""
{G}╔══════════════════════════════════════════════╗
║{B}            نصب با موفقیت انجام شد           {N}{G}║
╚══════════════════════════════════════════════╝{N}

  {B}نام کاربری:{N}  {data.get('username')}
  {B}رمز عبور:{N}    {data.get('password')}
  {B}Access UUID:{N} {data.get('accessUUID')}

  {C}لینک ورود:{N}
  {data.get('loginUrl') or worker_url + '/' + data.get('accessUUID','') + '/login'}

  {C}لینک پنل:{N}
  {data.get('panelUrl')}

  {C}سابسکریپشن:{N}
  {data.get('subscriptionUrl')}

  {C}کانفیگ پیشنهادی:{N}
  {data.get('configLink','')[:80]}...

  {Y}پشتیبانی تلگرام:{N} {SUPPORT_TG}

  {DIM}این اطلاعات را ذخیره کن — لینک پنل مخفی است.{N}
"""
    )


def main() -> None:
    banner()
    ensure_tools()

    cfg = load_config()
    print(f"  {B}[۱/۳] Cloudflare API Token{N}")
    print(f"  {DIM}بساز از:{N} {C}https://dash.cloudflare.com/profile/api-tokens{N}")
    print(f"  {DIM}قالب پیشنهادی: Edit Cloudflare Workers{N}\n")

    token = ask("توکن را اینجا بچسبان", "")
    if not token or len(token) < 20:
        err("توکن معتبر نیست")
        sys.exit(1)

    info("در حال بررسی توکن...")
    try:
        accounts = cf(token, "/accounts?per_page=5")
    except Exception as e:
        err(f"توکن رد شد: {e}")
        print(f"  {DIM}Permission لازم: Account Read + Workers Edit + D1 Edit{N}")
        sys.exit(1)

    results = accounts.get("result") or []
    if not results:
        err("هیچ اکانت Cloudflare پیدا نشد")
        sys.exit(1)

    if len(results) == 1:
        account = results[0]
    else:
        print("\n  اکانت‌های پیدا شده:")
        for i, a in enumerate(results, 1):
            print(f"    {i}) {a.get('name')}")
        idx = ask("شماره اکانت را انتخاب کن", "1")
        try:
            account = results[int(idx) - 1]
        except Exception:
            account = results[0]

    account_id = account["id"]
    ok(f"متصل به اکانت: {account.get('name')}")

    print()
    print(f"  {B}[۲/۳] نام کاربری پنل{N}")
    username = ask("نام کاربری", "admin")
    if not re.match(r"^[\w.-]{3,32}$", username):
        err("نام کاربری نامعتبر (۳–۳۲ کاراکتر لاتین/عدد)")
        sys.exit(1)

    print()
    print(f"  {B}[۳/۳] رمز عبور پنل{N}")
    password = ask("رمز عبور (Enter = ساخت خودکار)", "", secret=True)
    if password and len(password) < 6:
        err("رمز حداقل ۶ کاراکتر")
        sys.exit(1)
    if not password:
        password = secrets.token_urlsafe(12)
        ok(f"رمز خودکار: {password}")

    # Defaults for open-source simplicity — no extra questions
    worker_name = re.sub(r"[^a-z0-9-]", "-", (cfg.get("worker_name") or "xraymod").lower())[:40] or "xraymod"
    d1_name = "xraymod-db"
    print()
    info(f"Worker: {worker_name} · D1: {d1_name}")
    info("در حال ساخت پنل... (ممکن است چند دقیقه طول بکشد)")

    try:
        ensure_deps()
        build_ui()
        d1_id = create_or_get_d1(token, account_id, d1_name)
        ensure_workers_subdomain(token, account_id)
        write_wrangler(d1_id, worker_name)
        worker_url = deploy_worker(token, account_id, worker_name)
        # wait for workers.dev DNS + TLS to settle
        info("منتظر آماده‌شدن edge (چند ثانیه)...")
        time.sleep(8)
        # Verify the deployed worker is actually reachable before calling it done
        if not verify_worker_url(worker_url):
            err(f"Worker URL did not become reachable: {worker_url}")
            print(f"\n  {Y}توجه: دیپلوی انجام شده ولی تأیید دسترسی ناموفق بود.") 
            print(f"  ورک‌ر ممکن است هنوز در حال انتشار باشد — چند دقیقه بعد بررسی کن: {worker_url}")
            sys.exit(2)
        data = bootstrap_remote(worker_url, username, password)
        save_config(
            {
                "account_id": account_id,
                "worker_name": worker_name,
                "d1_id": d1_id,
                "worker_url": worker_url,
                "panel_url": data.get("panelUrl"),
                "username": username,
            }
        )
        print_success(data, worker_url)
    except Exception as e:
        err(str(e))
        print(f"\n  {Y}پشتیبانی:{N} {SUPPORT_TG}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
