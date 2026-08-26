#!/usr/bin/env bash
set -euo pipefail

echo "=================================================="
echo " 🤖 Oh My Pi (omp) Telegram Bot Deployment Script "
echo "=================================================="

# Check for Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Bun not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "✅ Bun version: $(bun --version)"

# Check for OMP
if ! command -v omp &> /dev/null; then
    echo "📦 Installing @oh-my-pi/pi-coding-agent..."
    bun add -g @oh-my-pi/pi-coding-agent
fi

# Load .env if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "📄 Loading configuration from $SCRIPT_DIR/.env..."
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN is not set."
    echo "Please export TELEGRAM_BOT_TOKEN or create a .env file."
    exit 1
fi

echo "🚀 Starting OMP Telegram Bot..."
cd "$SCRIPT_DIR"
exec bun run src/index.ts "$@"
