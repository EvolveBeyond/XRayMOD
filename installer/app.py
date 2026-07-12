"""XRayMOD Installer — FastAPI + WebUI with OAuth2 PKCE."""
from __future__ import annotations

import logging
import secrets
import webbrowser
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .cf_api import (
    CFClient, CFApiError, get_oauth_url, start_oauth_server, wait_for_oauth,
    create_d1, deploy_worker, get_worker_url, enable_subdomain, verify_token,
)
from .config import load, save
from .pipeline import deploy, verify_token as pipeline_verify, run_pipeline
from .deployer import fetch_worker_code, generate_password

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("xraymod.installer")

app = FastAPI(title="XRayMOD Installer")

STATIC_DIR = Path(__file__).parent / "static"
TEMPLATE_DIR = Path(__file__).parent / "templates"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Start OAuth callback server on startup
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
    if config.get("worker_url"):
        return {"installed": True, "worker_url": config["worker_url"], "mode": config.get("mode", "cloudflare")}
    return {"installed": False}


@app.get("/api/oauth/url")
async def oauth_url():
    """Get OAuth2 authorization URL."""
    url = get_oauth_url()
    return {"url": url}


@app.post("/api/oauth/wait")
async def oauth_wait(request: Request):
    """Wait for OAuth callback and return token."""
    body = await request.json()
    timeout = body.get("timeout", 300)

    result = wait_for_oauth(timeout=timeout)

    if not result or not result.get("ok"):
        error = result.get("error", "OAuth failed") if result else "Timeout"
        return JSONResponse({"error": error}, 400)

    # Get account info
    try:
        account = verify_token(result["access_token"])
        return {
            "success": True,
            "access_token": result["access_token"],
            "account": account,
        }
    except CFApiError as e:
        return JSONResponse({"error": str(e)}, 400)


@app.post("/api/deploy")
async def deploy_endpoint(request: Request):
    """Deploy using OAuth token."""
    body = await request.json()
    access_token = body.get("access_token", "").strip()
    worker_name = body.get("worker_name", f"cf-{secrets.token_hex(6)}")
    d1_name = body.get("d1_name", f"{worker_name}-db")
    admin_password = body.get("admin_password") or generate_password()

    if not access_token:
        return JSONResponse({"error": "Access token is required"}, 400)

    try:
        cf = CFClient(access_token)

        # Get account
        account_data = cf.req("GET", "/accounts?per_page=1")
        account_id = account_data["result"][0]["id"]
        account_name = account_data["result"][0]["name"]

        logger.info(f"Deploying to account: {account_name} ({account_id})")

        # Create D1
        d1 = create_d1(cf, account_id, d1_name)

        # Fetch worker code
        worker_code = fetch_worker_code()

        # Deploy worker
        deploy_worker(cf, account_id, worker_name, worker_code, d1["id"], admin_password)

        # Enable subdomain
        enable_subdomain(cf, account_id, worker_name)

        # Get URL
        worker_url = get_worker_url(cf, account_id, worker_name)

        # Save config
        save({
            "access_token": access_token,
            "worker_name": worker_name,
            "d1_name": d1_name,
            "d1_id": d1["id"],
            "worker_url": worker_url,
            "account_id": account_id,
            "account_name": account_name,
            "mode": "cloudflare",
        })

        logger.info(f"Deployment complete: {worker_url}")

        return {
            "success": True,
            "worker_name": worker_name,
            "worker_url": worker_url,
            "d1_database": d1_name,
            "d1_id": d1["id"],
            "admin_password": admin_password,
            "account_name": account_name,
        }
    except CFApiError as e:
        logger.error(f"Deployment failed: {e}")
        return JSONResponse({"error": str(e)}, 500)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return JSONResponse({"error": f"Unexpected error: {e}"}, 500)


@app.post("/api/deploy-server")
async def deploy_server(request: Request):
    return JSONResponse({"error": "VPS deployment coming in Phase 2"}, 501)


def main():
    import uvicorn
    config = load()
    if not config.get("worker_url"):
        print("\n  Opening installer in your browser...")
        webbrowser.open("http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
