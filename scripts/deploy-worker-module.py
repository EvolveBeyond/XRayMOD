#!/usr/bin/env python3
"""Deploy prebuilt worker.mjs + static UI via Cloudflare Workers API.

Avoids `wrangler deploy` from TypeScript source, which can trigger real CF Error 1101
(eval / incompatible bundle). Same path as in-panel self-update (rolling worker.mjs).
"""
from __future__ import annotations

import argparse
import base64
import gzip
import hashlib
import io
import json
import os
import ssl
import sys
import tarfile
import time
import urllib.error
import urllib.request
from pathlib import Path

CF = "https://api.cloudflare.com/client/v4"
CF_RETRIES = 5


def cf(token: str, method: str, path: str, body: bytes | None = None, content_type: str = "application/json"):
    last_err: Exception | None = None
    for attempt in range(CF_RETRIES):
        try:
            req = urllib.request.Request(
                f"{CF}{path}",
                data=body,
                method=method,
                headers={
                    "Authorization": f"Bearer {token}",
                    **({"Content-Type": content_type} if body is not None and content_type else {}),
                },
            )
            with urllib.request.urlopen(req, timeout=120) as res:
                return json.loads(res.read().decode())
        except (urllib.error.URLError, TimeoutError, ssl.SSLError) as e:
            last_err = e
            if attempt + 1 < CF_RETRIES:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise last_err  # type: ignore[misc]


def cf_form(token: str, path: str, fields: dict[str, tuple[str, bytes, str]]):
    boundary = "----xraymod" + hashlib.sha256(os.urandom(8)).hexdigest()[:16]
    chunks: list[bytes] = []
    for name, (filename, data, mime) in fields.items():
        chunks.append(f"--{boundary}\r\n".encode())
        disp = f'form-data; name="{name}"'
        if filename:
            disp += f'; filename="{filename}"'
        chunks.append(f"Content-Disposition: {disp}\r\n".encode())
        chunks.append(f"Content-Type: {mime}\r\n\r\n".encode())
        chunks.append(data)
        chunks.append(b"\r\n")
    chunks.append(f"--{boundary}--\r\n".encode())
    body = b"".join(chunks)
    last_err: Exception | None = None
    for attempt in range(CF_RETRIES):
        try:
            req = urllib.request.Request(
                f"{CF}{path}",
                data=body,
                method="PUT",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": f"multipart/form-data; boundary={boundary}",
                },
            )
            with urllib.request.urlopen(req, timeout=180) as res:
                return json.loads(res.read().decode())
        except (urllib.error.URLError, TimeoutError, ssl.SSLError) as e:
            last_err = e
            if attempt + 1 < CF_RETRIES:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise last_err  # type: ignore[misc]


def sha256_hex16(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:32]


def untar_gz(path: Path) -> dict[str, bytes]:
    raw = gzip.decompress(path.read_bytes())
    out: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(raw), mode="r:") as tf:
        for m in tf.getmembers():
            if not m.isfile():
                continue
            name = m.name.lstrip("./")
            key = "/" + name if not name.startswith("/") else name
            out[key.replace("//", "/")] = tf.extractfile(m).read()  # type: ignore[union-attr]
    return out


def pack_ui_dir(out_dir: Path) -> dict[str, bytes]:
    files: dict[str, bytes] = {}
    for p in out_dir.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(out_dir).as_posix()
        key = "/" + rel
        files[key] = p.read_bytes()
    return files


def upload_assets(token: str, account_id: str, script: str, files: dict[str, bytes]) -> str:
    manifest = {path: {"hash": sha256_hex16(data), "size": len(data)} for path, data in files.items()}
    by_hash = {sha256_hex16(data): data for data in files.values()}

    session = cf(
        token,
        "POST",
        f"/accounts/{account_id}/workers/scripts/{script}/assets-upload-session",
        json.dumps({"manifest": manifest}).encode(),
    )
    jwt = session.get("result", {}).get("jwt")
    if not jwt:
        raise RuntimeError("assets-upload-session: missing jwt")

    buckets: list[list[str]] = session.get("result", {}).get("buckets") or []
    if not buckets:
        return jwt

    for bucket in buckets:
        boundary = "----assets" + hashlib.sha256(os.urandom(8)).hexdigest()[:16]
        chunks: list[bytes] = []
        for h in bucket:
            data = by_hash.get(h)
            if data is None:
                continue
            chunks.append(f"--{boundary}\r\n".encode())
            chunks.append(f'Content-Disposition: form-data; name="{h}"\r\n'.encode())
            chunks.append(b"Content-Type: application/octet-stream\r\n\r\n")
            chunks.append(base64.b64encode(data))
            chunks.append(b"\r\n")
        chunks.append(f"--{boundary}--\r\n".encode())
        body = b"".join(chunks)
        req = urllib.request.Request(
            f"{CF}/accounts/{account_id}/workers/assets/upload?base64=true",
            data=body,
            method="POST",
            headers={
                "Authorization": f"Bearer {jwt}",
                "Content-Type": f"multipart/form-data; boundary={boundary}",
            },
        )
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode())
        jwt = data.get("result", {}).get("jwt") or data.get("jwt") or jwt
    return jwt


def get_script_settings(token: str, account_id: str, script: str) -> dict:
    try:
        return cf(token, "GET", f"/accounts/{account_id}/workers/scripts/{script}/settings")
    except urllib.error.HTTPError:
        return {}


def deploy_module(
    token: str,
    account_id: str,
    script: str,
    module_bytes: bytes,
    d1_id: str,
    assets_jwt: str | None,
) -> None:
    bindings: list[dict] = [
        {"type": "d1", "name": "DB", "id": d1_id},
        {"type": "assets", "name": "ASSETS"},
    ]
    settings = get_script_settings(token, account_id, script)
    existing = (settings.get("result") or {}).get("bindings") or []
    skip = {"DB", "ASSETS"}
    for b in existing:
        name = b.get("name")
        if not name or name in skip or b.get("type") in ("d1", "assets"):
            continue
        copy = dict(b)
        copy.pop("dataset_id", None)
        bindings.append(copy)

    have = {b.get("name") for b in bindings}
    for name, text in (
        ("EXTERNAL_SERVER_URL", ""),
        ("DISGUISE_PAGE", "404"),
        ("PANEL_RECOVERY", "false"),
        ("CRYPTO_KEY", ""),
    ):
        if name not in have:
            bindings.append({"type": "plain_text", "name": name, "text": text})

    metadata: dict = {
        "main_module": "worker.mjs",
        "bindings": bindings,
        "compatibility_date": "2024-11-01",
    }
    if assets_jwt:
        metadata["assets"] = {
            "jwt": assets_jwt,
            "config": {
                "run_worker_first": True,
                "not_found_handling": "none",
            },
        }

    cf_form(
        token,
        f"/accounts/{account_id}/workers/scripts/{script}",
        {
            "metadata": (
                "metadata",
                json.dumps(metadata).encode(),
                "application/json",
            ),
            "worker.mjs": ("worker.mjs", module_bytes, "application/javascript+module"),
        },
    )


def bundle_worker(root: Path, cfg: Path | None) -> bytes:
    import subprocess

    out = root / ".deploy" / "bundle"
    out.mkdir(parents=True, exist_ok=True)
    cmd = ["npx", "wrangler", "deploy", "--dry-run", f"--outdir={out}"]
    if cfg and cfg.is_file():
        cmd.extend(["--config", str(cfg)])
    subprocess.run(cmd, cwd=root, check=True)
    for name in ("worker.mjs", "index.mjs", "index.js"):
        p = out / name
        if p.is_file():
            return p.read_bytes()
    for p in sorted(out.glob("*.mjs")) + sorted(out.glob("*.js")):
        if p.name.endswith(".map"):
            continue
        return p.read_bytes()
    raise RuntimeError(f"no worker module in {out}")


def main() -> int:
    ap = argparse.ArgumentParser(description="Deploy worker.mjs module + UI assets")
    ap.add_argument("worker_name")
    ap.add_argument("d1_id")
    ap.add_argument("--account-id", default=os.environ.get("CLOUDFLARE_ACCOUNT_ID", ""))
    ap.add_argument("--token", default=os.environ.get("CLOUDFLARE_API_TOKEN", ""))
    ap.add_argument("--module", type=Path, help="Prebuilt worker.mjs (skip wrangler bundle)")
    ap.add_argument("--assets-tar", type=Path, help="assets.tar.gz from frontend/out")
    ap.add_argument("--ui-dir", type=Path, default=Path("frontend/out"))
    ap.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    ap.add_argument("--skip-assets", action="store_true")
    args = ap.parse_args()

    token = (args.token or "").strip()
    account_id = (args.account_id or "").strip()
    if len(token) < 20:
        print("Set CLOUDFLARE_API_TOKEN", file=sys.stderr)
        return 1
    if not account_id:
        accounts = cf(token, "GET", "/accounts?per_page=1")
        account_id = accounts["result"][0]["id"]

    root = args.root.resolve()
    os.chdir(root)

    if args.module and args.module.is_file():
        module_bytes = args.module.read_bytes()
        print(f"==> module: {args.module} ({len(module_bytes)} bytes)")
    else:
        print("==> bundle worker (wrangler dry-run)")
        module_bytes = bundle_worker(root, None)
        print(f"==> module: {len(module_bytes)} bytes")

    assets_jwt = None
    if not args.skip_assets:
        files: dict[str, bytes] | None = None
        if args.assets_tar and args.assets_tar.is_file():
            print(f"==> unpack {args.assets_tar}")
            files = untar_gz(args.assets_tar)
        elif args.ui_dir.is_dir():
            print(f"==> pack {args.ui_dir}")
            files = pack_ui_dir(args.ui_dir)
        if files:
            print(f"==> upload {len(files)} UI files")
            assets_jwt = upload_assets(token, account_id, args.worker_name, files)
            print("==> assets uploaded")

    print(f"==> deploy {args.worker_name} (account={account_id[:8]}… d1={args.d1_id[:8]}…)")
    deploy_module(token, account_id, args.worker_name, module_bytes, args.d1_id, assets_jwt)
    print("OK: worker module deployed")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except urllib.error.HTTPError as e:
        body = e.read().decode(errors="replace")
        print(f"HTTP {e.code}: {body[:500]}", file=sys.stderr)
        raise SystemExit(1)
