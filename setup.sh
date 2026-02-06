#!/bin/bash

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║           OpenCode Buddy - One-Click Setup                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Check Node.js
echo "[1/5] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found! Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi
NODE_VER=$(node -v)
echo "✅ Node.js found: $NODE_VER"

# Check pnpm
echo ""
echo "[2/5] Checking pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "pnpm not found, installing..."
    npm install -g pnpm
fi
PNPM_VER=$(pnpm -v)
echo "✅ pnpm found: v$PNPM_VER"

# Install dependencies
echo ""
echo "[3/5] Installing dependencies..."
pnpm install
echo "✅ Dependencies installed"

# Build packages
echo ""
echo "[4/5] Building packages..."
pnpm --filter shared build
pnpm --filter game-core build
pnpm --filter renderer-pixi build
echo "✅ Packages built"

# Build Electron main process
echo ""
echo "[5/5] Building Electron app..."
cd apps/desktop-electron
npx tsc --project src/main/tsconfig.preload.json
npx tsc --project tsconfig.json
cd ../..
echo "✅ Electron app built"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  To start the app:                                           ║"
echo "║    pnpm --filter desktop-electron electron:dev               ║"
echo "║                                                              ║"
echo "║  To install OpenCode plugin:                                 ║"
echo "║    Copy packages/bridge-plugin to your OpenCode plugins dir  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
