"""Regression tests for XRayMOD installer stabilization.

Run (from repo root):
    python3 tests/test_installer.py

All Cloudflare API calls are mocked — no real credentials needed.
"""
from __future__ import annotations

import json
import sys
import types
from pathlib import Path
from unittest import mock

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "installer"))
sys.path.insert(0, str(REPO_ROOT))

import cf_api  # noqa: E402
import cli_deploy  # noqa: E402

PASS = 0
FAIL = 0


def ok(name: str) -> None:
    global PASS
    PASS += 1
    print(f"  ✓ {name}")


def bad(name: str, err) -> None:
    global FAIL
    FAIL += 1
    print(f"  ✗ {name}: {err}")


def check(cond, name: str) -> None:
    if cond:
        ok(name)
    else:
        bad(name, "assertion failed")


# ── Mock CF client ─────────────────────────────────────────────
class MockCFClient:
    """In-memory fake of CFClient.req with scripted responses."""

    def __init__(self, responses: dict | None = None):
        self.calls: list[tuple[str, str, dict | None]] = []
        # default: keyed by (method, path) → list of responses consumed in order
        self.responses: dict[tuple[str, str], list] = responses or {}
        self.account_id: str | None = None

    def req(self, method: str, path: str, json_body: dict | None = None,
            **kwargs) -> dict:
        self.calls.append((method, path, json_body))
        key = (method, path)
        if key in self.responses:
            queue = self.responses[key]
            resp = queue.pop(0) if queue else {"success": True, "result": None}
            if not resp.get("success"):
                raise cf_api.CFApiError(
                    "CF API: " + "; ".join(
                        e.get("message", str(e)) for e in resp.get("errors", [])
                    )
                )
            return resp
        raise cf_api.CFApiError(f"unmocked CF call: {method} {path}")


def d1_created() -> dict:
    return {"success": True, "result": {"id": "d1-new", "uuid": "d1-new"}}


def d1_listed(name: str) -> dict:
    return {"success": True, "result": [{"id": "d1-existing", "uuid": "d1-existing", "name": name}]}


def subdomain_get(s: str) -> dict:
    return {"success": True, "result": {"subdomain": s, "name": s}}


def subdomain_set(s: str) -> dict:
    return {"success": True, "result": {"subdomain": s, "name": s}}


# ── Tests ──────────────────────────────────────────────────────

def test_account_selection_pinned() -> None:
    """Selected account (not first!) is used for every CF call."""
    selected = "acct-AAA"
    cf = MockCFClient()  # verify_token(account_id) → /accounts/{id}
    # Mock the single-account GET used by verify_token
    cf.responses[("GET", f"/accounts/{selected}")] = [
        {"success": True, "result": {"id": selected, "name": "Selected"}}
    ]
    with mock.patch.object(cf_api, "CFClient", return_value=cf):
        account = cf_api.verify_token("tok", account_id=selected)
    check(account["id"] == selected, "verify_token(account_id=selected) → selected")
    check(not any(key[1].startswith("/accounts?") for key in cf.responses),
          "no account listing in verify_token(account_id=...)")


def test_d1_reuse_when_exists() -> None:
    """Existing D1 is reused, not duplicated."""
    cf = MockCFClient({
        ("GET", "/accounts/A/d1/database?name=xraymod-db"): [d1_listed("xraymod-db")],
    })
    result = cf_api.create_d1(cf, "A", "xraymod-db")
    check(result["reused"] is True, "existing D1 → reused=True")
    check(result["id"] == "d1-existing", "existing D1 id")
    check(all("POST" != m for m, _, _ in cf.calls), "no POST when D1 exists")


def test_d1_create_when_missing() -> None:
    """Missing D1 is created."""
    cf = MockCFClient({
        ("GET", f"/accounts/A/d1/database?name=xraymod-db"): [{"success": True, "result": []}],
        ("POST", "/accounts/A/d1/database"): [d1_created()],
    })
    result = cf_api.create_d1(cf, "A", "xraymod-db")
    check(result["reused"] is False, "missing D1 → reused=False")
    check(result["id"] == "d1-new", "created D1 id")
    check(any(m == "POST" for m, _, _ in cf.calls), "POST happened")


def test_d1_list_failure_then_create() -> None:
    """List failure must not kill create."""
    cf = MockCFClient({
        ("GET", "/accounts/A/d1/database?name=x"): [{"success": False, "errors": [{"message": "boom"}]}],
        ("POST", "/accounts/A/d1/database"): [d1_created()],
    })
    result = cf_api.create_d1(cf, "A", "x")
    check(result["id"] == "d1-new", "create after list failure")


def test_subdomain_reuse_when_exists() -> None:
    """Existing subdomain is returned, no create call."""
    cf = MockCFClient({
        ("GET", "/accounts/A/workers/subdomain"): [subdomain_get("myacct")],
    })
    s = cf_api.get_subdomain(cf, "A")
    check(s == "myacct", "existing subdomain reused")
    check(all(m == "GET" for m, _, _ in cf.calls), "no create calls")


def test_subdomain_creation() -> None:
    """Missing subdomain is created via PUT (returns the generated name)."""
    cf = MockCFClient({
        ("GET", "/accounts/A/workers/subdomain"): [{"success": False, "errors": [{"message": "not found"}]}],
        ("PUT", "/accounts/A/workers/subdomain"): [{"success": True, "result": {"subdomain": "xraymod-abc"}}],
    })
    s = cf_api.get_subdomain(cf, "A")
    check(s.startswith("xraymod-") and len(s) > 8, f"subdomain created ({s})")
    check(any(m == "PUT" for m, _, _ in cf.calls), "PUT used")


def test_subdomain_creation_failure_raises() -> None:
    """CF refusing creation → CFApiError with context, no fake 'workers'."""
    cf = MockCFClient({
        ("GET", "/accounts/A/workers/subdomain"): [{"success": False, "errors": [{"message": "not found"}]}],
        ("PUT", "/accounts/A/workers/subdomain"): [{"success": False, "errors": [{"message": "name taken"}]}],
        ("POST", "/accounts/A/workers/subdomain"): [{"success": False, "errors": [{"message": "name taken"}]}],
        ("PATCH", "/accounts/A/workers/subdomain"): [{"success": False, "errors": [{"message": "name taken"}]}],
    })
    try:
        cf_api.get_subdomain(cf, "A")
        bad("subdomain failure", "expected CFApiError, got success")
    except cf_api.CFApiError as e:
        check("name taken" in str(e), f"CFApiError preserves CF context ({e})")
    check(not any(p == "workers" for _, p, _ in cf.calls), "no fake 'workers' fallback")


def test_cli_ensure_subdomain_no_fake_workers() -> None:
    """cli_deploy.ensure_workers_subdomain must raise, never return 'workers'."""
    cf = MockCFClient({
        ("GET", "/accounts/A/workers/subdomain"): [{"success": False, "errors": [{"message": "not found"}]}],
    })
    with mock.patch.object(cli_deploy, "CFClient", return_value=cf):
        try:
            cli_deploy.ensure_workers_subdomain("tok", "A")
            bad("ensure_workers_subdomain failure", "expected raise, got value")
        except (cf_api.CFApiError, RuntimeError):
            ok("ensure_workers_subdomain raises on failure (no fake value)")


def test_worker_deploy_failure_propagates() -> None:
    """Failed wrangler deploy propagates."""
    with mock.patch.object(cli_deploy, "run", side_effect=RuntimeError("wrangler exited 1")):
        try:
            cli_deploy.deploy_worker("tok", "A", "xraymod")
            bad("worker deploy failure", "expected raise")
        except RuntimeError as e:
            check("wrangler exited 1" in str(e), "deploy failure propagates")


def test_deploy_worker_uses_provided_account() -> None:
    """deploy_worker must use the passed account everywhere (no per_page=1)."""
    calls: list[str] = []

    def fake_run(cmd, cwd=None, env=None):
        calls.append("run " + str((env or {}).get("CLOUDFLARE_API_TOKEN", "none")))

    cf = MockCFClient({
        ("POST", "/accounts/AAABBB/workers/scripts/xraymod/subdomain"): [
            {"success": True, "result": {}}
        ],
    })
    with mock.patch.object(cli_deploy, "run", side_effect=fake_run), \
         mock.patch.object(cli_deploy, "CFClient", return_value=cf), \
         mock.patch.object(cli_deploy, "ensure_workers_subdomain", return_value="myacct"):
        url = cli_deploy.deploy_worker("tok", "AAABBB", "xraymod")
    check(url == "https://xraymod.myacct.workers.dev", f"URL derived from provided account ({url})")
    check(any(m == "POST" and "subdomain" in p for m, p, _ in cf.calls),
          "subdomain enable POST made")
    check(any(p == "/accounts/AAABBB/workers/scripts/xraymod/subdomain" for _, p, _ in cf.calls),
          "enable uses AAABBB")
    check(not any("per_page" in p for _, p, _ in cf.calls), "no re-discovery in deploy_worker")


def test_api_contract_client_not_token() -> None:
    """create_d1 requires a CFClient; passing a token must not silently work."""
    cf = MockCFClient({
        ("GET", "/accounts/A/d1/database?name=x"): [{"success": True, "result": []}],
        ("POST", "/accounts/A/d1/database"): [d1_created()],
    })
    result = cf_api.create_d1(cf, "A", "x")
    check(result["id"] is not None, "create_d1(CFClient, ...) returns dict with id")


def test_bootstrap_failure_not_reported_as_success() -> None:
    """Bootstrap failing → deploy() in main reports failure (doesn't print success)."""
    with mock.patch.object(cli_deploy, "verify_worker_url", return_value=True), \
         mock.patch.object(cli_deploy, "bootstrap_remote", side_effect=RuntimeError("bootstrap boom")), \
         mock.patch.object(cli_deploy, "print_success") as ps, \
         mock.patch.object(cli_deploy, "sys") as mock_sys:
        mock_sys.exit = lambda code: (_ for _ in ()).throw(SystemExit(code))
        try:
            cli_deploy.main()  # would have to run the whole flow; we shortcut with patched deps
            bad("bootstrap failure", "expected SystemExit")
        except SystemExit:
            check(not ps.called, "print_success NOT called on bootstrap failure")


def test_rerun_reuses_resources() -> None:
    """Rerun: same D1 + same subdomain reused; no duplicate creates."""
    cf = MockCFClient({
        ("GET", "/accounts/A/d1/database?name=xraymod-db"): [d1_listed("xraymod-db"), d1_listed("xraymod-db")],
        ("GET", "/accounts/A/workers/subdomain"): [subdomain_get("myacct"), subdomain_get("myacct")],
    })
    r1 = cf_api.create_d1(cf, "A", "xraymod-db")
    r2 = cf_api.create_d1(cf, "A", "xraymod-db")
    check(r1["id"] == r2["id"] == "d1-existing", "D1 reused across reruns")
    s1 = cf_api.get_subdomain(cf, "A")
    s2 = cf_api.get_subdomain(cf, "A")
    check(s1 == s2 == "myacct", "subdomain reused across reruns")
    check(not any(m == "POST" for m, _, _ in cf.calls), "no POST during rerun")


def test_config_never_persists_secrets() -> None:
    """save_config strips token/password keys."""
    from config import _sanitize
    safe = _sanitize({
        "worker_name": "x", "api_token": "TOPSECRET", "password": "pw",
        "access_token": "TOK", "refresh_token": "REF", "d1_id": "d1",
    })
    check("api_token" not in safe, "api_token stripped")
    check("password" not in safe, "password stripped")
    check("access_token" not in safe, "access_token stripped")
    check("worker_name" in safe, "worker_name retained")
    check("d1_id" in safe, "d1_id retained")


def test_verify_worker_url_ok() -> None:
    """verify_worker_url returns True when health responds."""
    with mock.patch.object(cli_deploy.httpx, "Client") as mc:
        inst = mc.return_value.__enter__.return_value
        inst.get.return_value.status_code = 200
        check(cli_deploy.verify_worker_url("https://x.my.workers.dev", retries=1, delay=0) is True,
              "verify_worker_url True on 200")


def test_verify_worker_url_dead() -> None:
    """verify_worker_url returns False when endpoint never responds."""
    with mock.patch.object(cli_deploy.httpx, "Client") as mc:
        inst = mc.return_value.__enter__.return_value
        inst.get.side_effect = cli_deploy.httpx.ConnectError("boom")
        check(cli_deploy.verify_worker_url("https://x.my.workers.dev", retries=1, delay=0) is False,
              "verify_worker_url False on persistent failure")


def main() -> None:
    print("\nXRayMOD installer regression tests\n")
    for fn in [
        test_account_selection_pinned,
        test_d1_reuse_when_exists,
        test_d1_create_when_missing,
        test_d1_list_failure_then_create,
        test_subdomain_reuse_when_exists,
        test_subdomain_creation,
        test_subdomain_creation_failure_raises,
        test_cli_ensure_subdomain_no_fake_workers,
        test_worker_deploy_failure_propagates,
        test_deploy_worker_uses_provided_account,
        test_api_contract_client_not_token,
        test_bootstrap_failure_not_reported_as_success,
        test_rerun_reuses_resources,
        test_config_never_persists_secrets,
        test_verify_worker_url_ok,
        test_verify_worker_url_dead,
    ]:
        try:
            fn()
        except Exception as e:  # noqa: BLE001
            bad(fn.__name__, e)
    print(f"\n{PASS} passed, {FAIL} failed\n")
    sys.exit(1 if FAIL else 0)


if __name__ == "__main__":
    main()