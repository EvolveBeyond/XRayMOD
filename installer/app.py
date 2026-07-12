"""XRayMOD Installer — FastAPI + WebUI with IOP pipeline."""
from __future__ import annotations

import secrets
import webbrowser
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import cf_api
from .config import load
from .pipeline import deploy, verify_token, run_pipeline
from .deployer import generate_password

app = FastAPI(title="XRayMOD Installer")

STATIC_DIR = Path(__file__).parent / "static"
TEMPLATE_DIR = Path(__file__).parent / "templates"
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


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


@app.post("/api/verify-token")
async def verify_token_endpoint(request: Request):
    """IOP: runs only the verify_token processor."""
    body = await request.json()
    token = body.get("token", "").strip()
    if not token:
        return JSONResponse({"error": "Token is required"}, 400)

    state = run_pipeline({"token": token}, [verify_token])
    if "error" in state:
        return JSONResponse({"valid": False, "error": state["error"]}, 400)

    return {"valid": True, "account": state["account"]}


@app.post("/api/deploy")
async def deploy_endpoint(request: Request):
    """IOP: runs the full deployment pipeline."""
    body = await request.json()
    token = body.get("token", "").strip()
    worker_name = body.get("worker_name", f"cf-{secrets.token_hex(6)}")
    d1_name = body.get("d1_name", f"{worker_name}-db")
    admin_password = body.get("admin_password") or generate_password()

    if not token:
        return JSONResponse({"error": "Token is required"}, 400)

    try:
        result = deploy(token, worker_name, d1_name, admin_password)
        return {"success": True, **result}
    except Exception as e:
        return JSONResponse({"error": str(e)}, 500)


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
