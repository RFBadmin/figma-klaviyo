#!/usr/bin/env bash
set -e

# ── Figma → Klaviyo Plugin — Setup Script ────────────────────────────────────
# Requirements: Docker Desktop only — Git, Node.js, and Python are NOT needed.
# Docker handles everything: cloning, installing dependencies, and building.

REPO_URL="https://github.com/RFBadmin/figma-klaviyo.git"
REPO_DIR="figma-klaviyo"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   Figma → Klaviyo  —  Plugin Setup       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── 1. Check Docker is running ───────────────────────────────────────────────
if ! docker info > /dev/null 2>&1; then
  echo "✗ Docker is not running."
  echo "  → Open Docker Desktop, wait for it to start, then run this script again."
  echo ""
  exit 1
fi
echo "✓ Docker is running"
echo ""

# ── 2. Clone the repository (using Docker — no Git install needed) ───────────
if [ -d "plugin" ] && [ -f "docker-compose.yml" ]; then
  # Already inside the repo
  echo "✓ Repository already present"
elif [ -d "$REPO_DIR/plugin" ]; then
  # Repo cloned next to this script
  echo "✓ Repository already present"
  cd "$REPO_DIR"
else
  echo "Cloning repository (no Git install needed — using Docker)..."
  docker run --rm \
    -v "$(pwd)":/workspace \
    -w /workspace \
    alpine/git clone "$REPO_URL"
  echo "✓ Repository cloned"
  cd "$REPO_DIR"
fi
echo ""

# ── 3. Build the plugin (Node.js runs inside Docker — not installed locally) ─
echo "Installing dependencies and building plugin..."
echo "(First run takes ~30–60s while Docker downloads the Node.js image)"
echo ""
docker compose --profile build run --rm build-plugin

# ── 4. Done ──────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✓  All done!                           ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "  Load the plugin in Figma:"
echo ""
echo "  1. Open Figma Desktop App"
echo "  2. Main Menu (☰) → Plugins → Development"
echo "     → Import plugin from manifest…"
echo "  3. Select this file:"
echo "     $(pwd)/plugin/manifest.json"
echo ""
echo "  The plugin will appear under:"
echo "  Plugins → Development → Figma to Klaviyo"
echo ""
