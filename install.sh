#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  XrayMOD — One-Click Open Source Installer
#
#  Linux / macOS / Git Bash / WSL:
#    bash <(curl -fsSL https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.sh)
#
#  Windows PowerShell:
#    irm https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1 | iex
#
#  Windows CMD:
#    powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (iwr -UseBasicParsing 'https://raw.githubusercontent.com/askarniroomand/XRayMOD/main/install.ps1').Content"
#
#  Flow for end users:
#    1) Cloudflare API Token
#    2) Account (auto if only one)
#    3) Panel username
#    4) Panel password
#    5) Automatic deploy + print login / sub links
#
#  Support: https://t.me/MRROBOT_DT
# ═══════════════════════════════════════════════════════════════
set -euo pipefail

# Windows Git Bash / MSYS: ensure common Node/Git paths
if [[ "${OSTYPE:-}" == msys* || "${OSTYPE:-}" == cygwin* || -n "${MSYSTEM:-}" ]]; then
  export PATH="/c/Program Files/nodejs:/c/Program Files/Git/cmd:${PATH}"
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

INSTALLER_DIR="${HOME}/.xraymod"
REPO_URL="${XRAYMOD_REPO:-https://github.com/askarniroomand/XRayMOD.git}"
BRANCH="${XRAYMOD_BRANCH:-main}"

clear 2>/dev/null || true
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${BOLD}   XrayMOD  ·  Fully automatic install                 ${NC}${GREEN}║${NC}"
echo -e "${GREEN}║${DIM}   Token · user · password  →  panel ready         ${NC}${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}  DEPRECATED primary path:${NC} prefer the in-panel Wizard (/install) and rolling Worker artifacts."
echo -e "  This shell installer remains for compatibility until cleanup is approved."
echo ""

die() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }
step() { echo -e "${YELLOW}→${NC} $*"; }
ok() { echo -e "${GREEN}✓${NC} $*"; }

# ── prerequisites (auto where possible) ─────────────────────
command -v curl >/dev/null || die "curl is required"

ensure_node() {
  if command -v node >/dev/null; then
    local major
    major="$(node -v | sed 's/v//' | cut -d. -f1)"
    if [ "${major}" -ge 18 ] 2>/dev/null; then
      ok "Node $(node -v)"
      return 0
    fi
  fi

  step "Installing Node.js automatically..."
  if command -v brew >/dev/null; then
    brew install node@20 >/dev/null 2>&1 || brew install node >/dev/null 2>&1 || true
  elif command -v apt-get >/dev/null && [ "$(id -u)" -eq 0 ]; then
    apt-get update -qq && apt-get install -y -qq nodejs npm >/dev/null 2>&1 || true
  elif command -v dnf >/dev/null && [ "$(id -u)" -eq 0 ]; then
    dnf install -y nodejs npm >/dev/null 2>&1 || true
  elif command -v pacman >/dev/null && [ "$(id -u)" -eq 0 ]; then
    pacman -Sy --noconfirm nodejs npm >/dev/null 2>&1 || true
  fi

  # nvm fallback
  if ! command -v node >/dev/null; then
    export NVM_DIR="${HOME}/.nvm"
    if [ ! -s "${NVM_DIR}/nvm.sh" ]; then
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash >/dev/null 2>&1 || true
    fi
    # shellcheck disable=SC1091
    [ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh"
    command -v nvm >/dev/null 2>&1 && nvm install --lts >/dev/null 2>&1 || true
  fi

  command -v node >/dev/null || die "Node.js 18+ required — install from https://nodejs.org and run this command again"
  local major
  major="$(node -v | sed 's/v//' | cut -d. -f1)"
  [ "${major}" -ge 18 ] 2>/dev/null || die "Node.js 18+ required (current: $(node -v))"
  ok "Node $(node -v)"
}

ensure_node
command -v npm >/dev/null || die "npm not found"

HAS_GIT=0
if command -v git >/dev/null; then
  HAS_GIT=1
  ok "git found"
else
  echo -e "  ${DIM}no git — using ZIP download${NC}"
fi

# Python runner
export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
if ! command -v uv >/dev/null; then
  step "Installing uv (Python tool)..."
  curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1 || true
  export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"
fi

github_zip_url() {
  # https://github.com/owner/repo.git → archive zip
  local url="$1" branch="$2"
  if [[ "$url" =~ github\.com[:/]([^/]+)/([^/.]+) ]]; then
    local owner="${BASH_REMATCH[1]}"
    local repo="${BASH_REMATCH[2]%.git}"
    echo "https://github.com/${owner}/${repo}/archive/refs/heads/${branch}.zip"
    return 0
  fi
  return 1
}

fetch_zip() {
  local zip_url
  zip_url="$(github_zip_url "${REPO_URL}" "${BRANCH}")" \
    || die "Without git only GitHub repos are supported — install git"
  step "Downloading source (no git)..."
  local zip_path="${INSTALLER_DIR}/xraymod-src.zip"
  local extract_dir="${INSTALLER_DIR}/_extract"
  rm -rf "${extract_dir}" "${INSTALLER_DIR}/XRayMOD"
  mkdir -p "${extract_dir}"
  curl -fsSL -o "${zip_path}" "${zip_url}" \
    || die "ZIP download failed — check internet / GitHub access"
  if command -v unzip >/dev/null; then
    unzip -q "${zip_path}" -d "${extract_dir}"
  elif command -v tar >/dev/null; then
    # bsdtar / GNU tar with libarchive can open zip
    tar -xf "${zip_path}" -C "${extract_dir}" 2>/dev/null \
      || die "unzip required (apt install unzip / brew install unzip)"
  else
    die "unzip required"
  fi
  rm -f "${zip_path}"
  local inner
  inner="$(find "${extract_dir}" -mindepth 1 -maxdepth 1 -type d | head -1)"
  [ -n "${inner}" ] || die "ZIP extraction was empty"
  mv "${inner}" "${INSTALLER_DIR}/XRayMOD"
  rm -rf "${extract_dir}"
}

# ── fetch source ────────────────────────────────────────────
mkdir -p "${INSTALLER_DIR}"
if [ "${HAS_GIT}" -eq 1 ] && [ -d "${INSTALLER_DIR}/XRayMOD/.git" ]; then
  step "Updating repository..."
  git -C "${INSTALLER_DIR}/XRayMOD" remote set-url origin "${REPO_URL}" 2>/dev/null || true
  git -C "${INSTALLER_DIR}/XRayMOD" fetch --depth 1 origin "${BRANCH}" --quiet 2>/dev/null || true
  git -C "${INSTALLER_DIR}/XRayMOD" checkout -f "${BRANCH}" --quiet 2>/dev/null || true
  git -C "${INSTALLER_DIR}/XRayMOD" reset --hard "origin/${BRANCH}" --quiet 2>/dev/null || \
    git -C "${INSTALLER_DIR}/XRayMOD" pull --ff-only --quiet 2>/dev/null || true
elif [ "${HAS_GIT}" -eq 1 ]; then
  step "Downloading XrayMOD..."
  rm -rf "${INSTALLER_DIR}/XRayMOD"
  if ! git clone --depth 1 -b "${BRANCH}" "${REPO_URL}" "${INSTALLER_DIR}/XRayMOD" 2>/dev/null; then
    echo -e "  ${DIM}git clone failed — switching to ZIP...${NC}"
    fetch_zip
  fi
else
  fetch_zip
fi

cd "${INSTALLER_DIR}/XRayMOD"
[ -f installer/cli_deploy.py ] || die "installer/cli_deploy.py missing from repo — did you push main?"
ok "Source ready"
echo ""

# ── run interactive deploy ──────────────────────────────────
if command -v uv >/dev/null; then
  exec uv run --with httpx python installer/cli_deploy.py "$@"
fi

# fallback: system python
if command -v python3 >/dev/null; then
  python3 -m pip install --user -q httpx 2>/dev/null || true
  exec python3 installer/cli_deploy.py "$@"
fi

die "python3 or uv required"
