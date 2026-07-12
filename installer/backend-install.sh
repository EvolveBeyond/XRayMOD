#!/usr/bin/env bash
# XrayMOD Backend Installer
# Installs Xray-core on a VPS for use with XrayMOD panel
#
# Usage:
#   bash backend-install.sh <panel-url> <user-uuid>
#
# Example:
#   bash backend-install.sh https://your-panel.workers.dev abc123-def456-...

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PANEL_URL="${1:-}"
USER_UUID="${2:-}"

if [ -z "$PANEL_URL" ] || [ -z "$USER_UUID" ]; then
  echo -e "${RED}Usage: bash backend-install.sh <panel-url> <user-uuid>${NC}"
  echo ""
  echo "  panel-url   Your XrayMOD panel URL (e.g., https://your-panel.workers.dev)"
  echo "  user-uuid   Your user UUID from the panel"
  exit 1
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     XrayMOD Backend Installer        ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Error: Run as root (sudo)${NC}"
  exit 1
fi

# Detect OS
if [ -f /etc/debian_version ]; then
  OS="debian"
elif [ -f /etc/redhat-release ]; then
  OS="redhat"
else
  echo -e "${RED}Error: Unsupported OS. Use Ubuntu/Debian${NC}"
  exit 1
fi

echo -e "${YELLOW}→${NC} Detecting system architecture..."
ARCH=$(uname -m)
case "$ARCH" in
  x86_64) XRAY_ARCH="amd64" ;;
  aarch64) XRAY_ARCH="arm64" ;;
  armv7l) XRAY_ARCH="armv7" ;;
  *) echo -e "${RED}Error: Unsupported architecture: $ARCH${NC}"; exit 1 ;;
esac
echo -e "${GREEN}✓${NC} Architecture: $XRAY_ARCH"

# Install Xray-core
echo -e "${YELLOW}→${NC} Installing Xray-core..."
XRAY_VERSION=$(curl -sL "https://api.github.com/repos/XTLS/xray-core/releases/latest" | grep '"tag_name"' | head -1 | sed -E 's/.*"([^"]+)".*/\1/' || echo "v1.8.4")
XRAY_URL="https://github.com/XTLS/xray-core/releases/download/${XRAY_VERSION}/Xray-linux-${ARCH}.zip"

cd /tmp
curl -sL "$XRAY_URL" -o xray.zip
unzip -o xray.zip -d xray-temp
mv xray-temp/xray /usr/local/bin/xray
chmod +x /usr/local/bin/xray
rm -rf xray.zip xray-temp

# Generate config
XRAY_CONFIG_DIR="/usr/local/etc/xray"
mkdir -p "$XRAY_CONFIG_DIR"

cat > "$XRAY_CONFIG_DIR/config.json" << EOF
{
  "log": {
    "loglevel": "warning"
  },
  "inbounds": [
    {
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "${USER_UUID}",
            "flow": "xtls-rprx-vision"
          }
        ],
        "decryption": "none"
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "path": "/ws"
        },
        "security": "tls",
        "tlsSettings": {
          "certificates": [
            {
              "certificateFile": "${XRAY_CONFIG_DIR}/cert.pem",
              "keyFile": "${XRAY_CONFIG_DIR}/key.pem"
            }
          ]
        }
      }
    }
  ],
  "outbounds": [
    {
      "protocol": "freedom",
      "tag": "direct"
    },
    {
      "protocol": "blackhole",
      "tag": "blocked"
    }
  ],
  "routing": {
    "rules": [
      {
        "type": "field",
        "ip": ["geoip:private"],
        "outboundTag": "blocked"
      }
    ]
  }
}
EOF

# Generate self-signed cert (user should replace with real cert)
echo -e "${YELLOW}→${NC} Generating self-signed certificate..."
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "$XRAY_CONFIG_DIR/key.pem" \
  -out "$XRAY_CONFIG_DIR/cert.pem" \
  -subj "/CN=cloudflare-dns.com" 2>/dev/null

# Create systemd service
cat > /etc/systemd/system/xray.service << 'EOF'
[Unit]
Description=XrayMOD Backend
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/xray run -config /usr/local/etc/xray/config.json
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
systemctl daemon-reload
systemctl enable xray
systemctl restart xray

echo ""
echo -e "${GREEN}✓${NC} Xray-core installed and started!"
echo ""
echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Backend is running on port 443      ║${NC}"
echo -e "${GREEN}║  Panel: ${PANEL_URL}                ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to your panel → Marketplace → Your Server"
echo "2. Enter this VPS IP: $(curl -s ifconfig.me)"
echo "3. Your subscription will use this backend"
echo ""
echo -e "${YELLOW}To manage:${NC}"
echo "  systemctl status xray    # Check status"
echo "  systemctl restart xray   # Restart"
echo "  journalctl -u xray -f    # View logs"
echo ""
echo -e "${YELLOW}To use a real certificate:${NC}"
echo "  1. Install certbot: apt install certbot"
echo "  2. Get cert: certbot certonly --standalone -d your-domain.com"
echo "  3. Update config: /usr/local/etc/xray/config.json"
echo "  4. Restart: systemctl restart xray"
