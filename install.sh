#!/usr/bin/env bash
# XrayMOD Installer — Stage 1 (Bash)
# Downloads and runs the Python installer via uv.
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/refs/heads/main/install.sh)
#
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

INSTALLER_URL="https://raw.githubusercontent.com/EvolveBeyond/XRayMOD/refs/heads/main/installer/install.py"
INSTALLER_DIR="${HOME}/.xraymod"
INSTALLER_PY="${INSTALLER_DIR}/install.py"

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        XrayMOD Installer             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Check curl ──────────────────────────────────────
if ! command -v curl &>/dev/null; then
    echo -e "${RED}Error: curl is required but not installed.${NC}"
    echo "Install it with your package manager and try again."
    exit 1
fi

# ── Step 2: Check/install uv ────────────────────────────────
if command -v uv &>/dev/null; then
    echo -e "${GREEN}✓${NC} uv found: $(uv --version)"
else
    echo -e "${YELLOW}→${NC} uv not found. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh 2>/dev/null

    # uv installs to ~/.local/bin or ~/.cargo/bin — make sure it's in PATH
    export PATH="${HOME}/.local/bin:${HOME}/.cargo/bin:${PATH}"

    if ! command -v uv &>/dev/null; then
        echo -e "${RED}Error: uv installation failed.${NC}"
        echo "Install manually: https://docs.astral.sh/uv/getting-started/installation/"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} uv installed: $(uv --version)"
fi

# ── Step 3: Download installer script ───────────────────────
echo ""
echo -e "${YELLOW}→${NC} Downloading installer..."
mkdir -p "${INSTALLER_DIR}"

if ! curl -fsSL "${INSTALLER_URL}" -o "${INSTALLER_PY}"; then
    echo -e "${RED}Error: Failed to download installer.${NC}"
    echo "URL: ${INSTALLER_URL}"
    exit 1
fi
echo -e "${GREEN}✓${NC} Installer downloaded to ${INSTALLER_PY}"

# ── Step 4: Run Python installer via uv ─────────────────────
echo ""
echo -e "${YELLOW}→${NC} Starting installer..."
echo ""
exec uv run "${INSTALLER_PY}" "$@"
