"""XRayMOD Installer — FastAPI + WebUI with OAuth2, deploy, update, delete."""
from __future__ import annotations

import logging
import secrets
import subprocess
import webbrowser
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .cf_api import (
    CFClient, CFApiError, get_oauth_url, start_oauth_server, wait_for_oauth,
    create_d1, deploy_worker, get_worker_url, enable_subdomain, verify_token,
    get_worker_account, delete_worker, delete_d1, deploy_frontend,
)
from .config import load, save
from .deployer import fetch_worker_code, generate_password

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s", datefmt="%H:%M:%S")
logger = logging.getLogger("xraymod.installer")

app = FastAPI(title="XRayMOD Installer")
STATIC_DIR = Path(__file__).parent / "static"
TEMPLATE_DIR = Path(__file__).parent / "templates"
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
start_oauth_server()


@app.get("/", response_class=HTMLResponse)
async def index():
    return (TEMPLATE_DIR / "index.html").read_text()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/status")
async def status():
    config = load()
    return {
        "installed": bool(config.get("worker_url")),
        "worker_url": config.get("worker_url", ""),
        "worker_name": config.get("worker_name", ""),
        "d1_name": config.get("d1_name", ""),
        "account_name": config.get("account_name", ""),
        "mode": config.get("mode", ""),
    }


@app.get("/api/oauth/url")
async def oauth_url():
    return {"url": get_oauth_url()}


@app.post("/api/oauth/wait")
async def oauth_wait(request: Request):
    body = await request.json()
    result = wait_for_oauth(timeout=body.get("timeout", 300))
    if not result or not result.get("ok"):
        return JSONResponse({"error": result.get("error", "Failed") if result else "Timeout"}, 400)
    try:
        account = verify_token(result["access_token"])
        # Save token for reuse
        config = load()
        save({**config, "access_token": result["access_token"], "account_name": account["name"]})
        return {"success": True, "access_token": result["access_token"], "account": account}
    except CFApiError as e:
        return JSONResponse({"error": str(e)}, 400)


@app.get("/api/check-token")
async def check_token():
    """Check if saved token is still valid."""
    config = load()
    token = config.get("access_token", "")
    if not token:
        return {"valid": False}
    try:
        account = verify_token(token)
        return {"valid": True, "access_token": token, "account": account}
    except CFApiError:
        return {"valid": False}


@app.post("/api/deploy")
async def deploy_endpoint(request: Request):
    body = await request.json()
    access_token = body.get("access_token", "").strip()
    worker_name = body.get("worker_name", "") or f"cf-{secrets.token_hex(6)}"
    d1_name = body.get("d1_name", "") or f"{worker_name}-db"

    if not access_token:
        return JSONResponse({"error": "Access token required"}, 400)

    try:
        cf = CFClient(access_token)
        account_id, account_name = get_worker_account(access_token)
        logger.info(f"Deploying to: {account_name}")

        # Delete old worker if exists (clean install, not update)
        old_config = load()
        if old_config.get("worker_name") and old_config["worker_name"] != worker_name:
            logger.info(f"Deleting old worker: {old_config['worker_name']}")
            try:
                delete_worker(cf, account_id, old_config["worker_name"])
            except CFApiError:
                pass

        # Deploy worker
        d1 = create_d1(cf, account_id, d1_name)
        worker_code = fetch_worker_code()
        deploy_worker(cf, account_id, worker_name, worker_code, d1["id"])
        enable_subdomain(cf, account_id, worker_name)
        worker_url = get_worker_url(cf, account_id, worker_name)

        # Build and deploy frontend to Pages
        pages_name = f"{worker_name}-panel"
        try:
            logger.info(f"Building frontend...")
            subprocess.run(["npm", "run", "build"], cwd=str(FRONTEND_DIR), check=True, capture_output=True, timeout=120)
            logger.info(f"Deploying frontend to Pages: {pages_name}")
            deploy_frontend(cf, account_id, pages_name, FRONTEND_DIR / ".next" / "static")
        except Exception as e:
            logger.warning(f"Frontend deploy failed (non-critical): {e}")

        save({
            "access_token": access_token, "worker_name": worker_name,
            "d1_name": d1_name, "d1_id": d1["id"], "worker_url": worker_url,
            "pages_name": pages_name,
            "account_id": account_id, "account_name": account_name, "mode": "cloudflare",
        })

        return {
            "success": True, "worker_name": worker_name, "worker_url": worker_url,
            "d1_database": d1_name, "d1_id": d1["id"], "account_name": account_name,
        }
    except CFApiError as e:
        return JSONResponse({"error": str(e)}, 500)
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)


@app.post("/api/update")
async def update_endpoint(request: Request):
    body = await request.json()
    access_token = body.get("access_token", "").strip() or load().get("access_token", "")

    if not access_token:
        return JSONResponse({"error": "Access token required"}, 400)

    config = load()
    worker_name = config.get("worker_name", "")
    d1_id = config.get("d1_id", "")

    if not worker_name or not d1_id:
        return JSONResponse({"error": "No existing deployment found. Deploy first."}, 400)

    try:
        cf = CFClient(access_token)
        account_id = config.get("account_id", "")

        worker_code = fetch_worker_code()
        deploy_worker(cf, account_id, worker_name, worker_code, d1_id)
        enable_subdomain(cf, account_id, worker_name)
        worker_url = get_worker_url(cf, account_id, worker_name)

        save({**config, "worker_url": worker_url, "access_token": access_token})

        return {"success": True, "worker_name": worker_name, "worker_url": worker_url}
    except CFApiError as e:
        return JSONResponse({"error": str(e)}, 500)


@app.post("/api/delete")
async def delete_endpoint(request: Request):
    body = await request.json()
    access_token = body.get("access_token", "").strip() or load().get("access_token", "")
    confirm = body.get("confirm", "")

    if not access_token:
        return JSONResponse({"error": "Access token required"}, 400)
    if confirm != "DELETE":
        return JSONResponse({"error": "Type DELETE to confirm"}, 400)

    config = load()
    worker_name = config.get("worker_name", "")
    d1_id = config.get("d1_id", "")
    account_id = config.get("account_id", "")

    if not worker_name:
        return JSONResponse({"error": "No deployment found"}, 400)

    try:
        cf = CFClient(access_token)
        results = {"worker": False, "d1": False}

        try:
            delete_worker(cf, account_id, worker_name)
            results["worker"] = True
        except CFApiError as e:
            results["worker_error"] = str(e)

        if d1_id:
            try:
                delete_d1(cf, account_id, d1_id)
                results["d1"] = True
            except CFApiError as e:
                results["d1_error"] = str(e)

        # Clear saved config
        save({"access_token": access_token})

        return {"success": True, "results": results}
    except CFApiError as e:
        return JSONResponse({"error": str(e)}, 500)


def main():
    import uvicorn
    config = load()
    if not config.get("worker_url"):
        print("\n  Opening installer...")
        webbrowser.open("http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
