#!/usr/bin/env bash
set -euo pipefail

# Ensure standard bin paths are in PATH
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:$PATH"

echo "=================================================="
echo " 🤖 Oh My Pi (omp) Telegram Bot Deployment Script "
echo "=================================================="

# 1. Check / Install Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Bun not found. Installing Bun runtime..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "✅ Bun version: $(bun --version)"

# 2. Check / Install OMP Agent
if ! command -v omp &> /dev/null; then
    echo "📦 OMP CLI not found in PATH. Installing @oh-my-pi/pi-coding-agent..."
    bun add -g @oh-my-pi/pi-coding-agent
fi

if command -v omp &> /dev/null; then
    echo "✅ OMP CLI found: $(which omp)"
else
    echo "⚠️ Warning: omp not in PATH, will use fallback resolver (~/.bun/bin/omp)"
fi

# 3. Load .env if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "📄 Loading configuration from $SCRIPT_DIR/.env..."
    # Export all non-commented env vars safely
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
fi

# 4. Check Telegram Bot Token
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ]; then
    echo "❌ Error: TELEGRAM_BOT_TOKEN is not set."
    echo "Please copy .env.example to .env and configure your TELEGRAM_BOT_TOKEN."
    exit 1
fi

echo "🚀 Starting OMP Telegram Bot..."
cd "$SCRIPT_DIR"
exec bun run src/index.ts "$@"
