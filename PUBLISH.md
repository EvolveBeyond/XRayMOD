# Zero-to-Hero GitHub Publishing Guide (Open Source)

This file is for the **project owner** — not end users.

---

## End result for the public

Users only run:

```bash
# Linux / macOS / Git Bash / WSL
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)

# Windows CMD / PowerShell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex

```

And only enter:

1. Cloudflare API Token  
2. Username  
3. Password  

→ The panel is created and **SECURE PATH** links are printed (`/{UUID}/panel`, `/{UUID}/sub/...`).

Target version: **1.9.12** — see [CHANGELOG.md](CHANGELOG.md) for details.

---

## Prerequisites (publisher)

- GitHub account (repo: `askarniroomand/XRayMOD` or your fork)
- `git` on your system
- Push access to the repo

---

## Step 1 — Clean up before push

- No Cloudflare tokens inside files  
- `wrangler.toml` only has placeholders (`REPLACE_WITH_YOUR_D1_ID`)  
- `frontend/out` and `node_modules` are in `.gitignore`  
- `LICENSE`, `README.md`, `install.sh`, `install.ps1`, and `install.cmd` exist  

---

## Step 2 — Commit and push

```bash
cd /Users/niroomand/Desktop/XRayMOD

git status
git add -A
git status   # verify no secrets

git commit -m "release: open-source one-click installer"

git push -u origin main
```

If you created a new repo:

```bash
gh repo create askarniroomand/XRayMOD --public --source=. --remote=origin --push
# or
git remote add origin https://github.com/YOUR_USER/XRayMOD.git
git push -u origin main
```

---

## Step 3 — Test the public command

**Important:** After push, wait ~10–30 seconds for raw.githubusercontent.com to update.

```bash
# Test on a clean machine / new terminal:
# Linux / macOS / Git Bash / WSL
bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)

# Windows CMD / PowerShell
irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex

```

If your repo or branch differs:

```bash
# Example personal fork:
export XRAYMOD_REPO=https://github.com/YOUR_USER/XRayMOD.git
export XRAYMOD_BRANCH=main
bash <(curl -fsSL https://cdn.jsdelivr.net/gh/YOUR_USER/XRayMOD@main/install.sh)
```

> `install.sh` reads `REPO_URL` from `XRAYMOD_REPO`; default is `askarniroomand/XRayMOD`.

---

## Step 4 — GitHub repo settings (optional but professional)

In repo Settings:

| Item | Suggestion |
|------|------------|
| Description | Modular proxy panel on Cloudflare Workers |
| Website | https://t.me/MRROBOT_DT |
| Topics | `cloudflare-workers`, `proxy`, `vless`, `panel`, `opensource` |
| License | MIT (from LICENSE file) |

In About → enable Issues / Discussions if desired.

---

## Step 5 — Your personal brand

| Item | Location |
|------|----------|
| Telegram support | `https://t.me/MRROBOT_DT` — in `install.sh`, `install.ps1`, `installer/cli_deploy.py`, panel `support` |
| Install URL | README + `install.sh` (Unix) + `install.ps1` / `install.cmd` (Windows) |
| Repo name | `askarniroomand/XRayMOD` |

If your GitHub username changes, update URLs in all three places:

- `install.sh` / `install.ps1` → `REPO_URL` / `XRAYMOD_REPO`
- `README.md`
- this file `PUBLISH.md`

---

## Step 6 — Future updates for users

Every time you push to `main`, users get the latest version with **the same one-liner** (the script `git pull`s or fresh-clones).

---

## Pre-launch checklist

- [ ] `git push origin main` succeeded  
- [ ] `curl -fsSL .../install.sh` returns no 404  
- [ ] `install.ps1` and `install.cmd` return no 404 (Windows)  
- [ ] Full install test with a test token  
- [ ] Telegram support link is correct  
- [ ] No real token / password in git  

---

## Common troubleshooting

| Problem | Fix |
|---------|-----|
| `404` on install.sh / install.ps1 | Not pushed or wrong branch/repo name |
| Node error | Install Node 18+ |
| Token invalid | Use Edit Cloudflare Workers template |
| workers.dev 1101 | CF account / subdomain issue; contact support |
| Bootstrap fail | Wait a few seconds; retry install |

---

## User support

Direct everyone to: **https://t.me/MRROBOT_DT**
