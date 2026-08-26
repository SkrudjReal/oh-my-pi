#!/usr/bin/env bash
set -e

# 1. Ensure all binary directories are in PATH
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:$PATH"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================================="
echo " 🤖 Oh My Pi (omp) Telegram Bot Deployment Script "
echo "=================================================="

# 2. Check / Install Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Bun runtime not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi
echo "✅ Bun version: $(bun --version)"

# 3. Check / Install OMP Agent
if ! command -v omp &> /dev/null; then
    echo "📦 OMP CLI not found. Installing Oh My Pi (omp)..."
    curl -fsSL https://omp.sh/install | sh
    export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:$PATH"
fi

if command -v omp &> /dev/null; then
    echo "✅ OMP CLI found: $(which omp)"
else
    echo "⚠️ Warning: 'omp' not found in PATH, trying bun add -g @oh-my-pi/pi-coding-agent..."
    bun add -g @oh-my-pi/pi-coding-agent
    export PATH="$HOME/.bun/bin:$PATH"
fi

# 4. Check .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚠️ .env not found. Creating .env from .env.example..."
        cp .env.example .env
        echo "📝 Created .env. Please edit it with your TELEGRAM_BOT_TOKEN and BOT_OWNER_ID:"
        echo "   nano .env"
        exit 1
    fi
fi

# 5. Install bot dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (bun install)..."
    bun install
fi

echo "🚀 Starting OMP Telegram Bot..."
exec bun run src/index.ts "$@"
