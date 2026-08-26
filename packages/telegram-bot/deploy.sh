#!/usr/bin/env bash
set -euo pipefail

# Ensure standard binary directories are in PATH
export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:$PATH"

# Source user profile/env if present
[ -f "$HOME/.profile" ] && source "$HOME/.profile" 2>/dev/null || true
[ -f "$HOME/.bashrc" ] && source "$HOME/.bashrc" 2>/dev/null || true
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null || true

echo "=================================================="
echo " 🤖 Oh My Pi (omp) Telegram Bot Deployment Script "
echo "=================================================="

# 1. Check / Install Bun
if ! command -v bun &> /dev/null; then
    echo "📦 Bun runtime not found. Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi
echo "✅ Bun version: $(bun --version)"

# 2. Check / Install OMP Agent via official installer
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

# 3. Load .env if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
    echo "📄 Loading configuration from $SCRIPT_DIR/.env..."
    set -a
    source "$SCRIPT_DIR/.env"
    set +a
else
    echo "⚠️ .env not found. Creating .env from .env.example..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
fi

# 4. Check Telegram Bot Token
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ "${TELEGRAM_BOT_TOKEN:-}" = "YOUR_TELEGRAM_BOT_TOKEN_HERE" ]; then
    echo ""
    echo "❌ Error: TELEGRAM_BOT_TOKEN is not configured in .env!"
    echo "Please open .env and set your token from @BotFather:"
    echo "  nano $SCRIPT_DIR/.env"
    exit 1
fi

# 5. Check OMP Authentication
echo "🔑 Checking OMP authentication status..."
if ! omp usage &> /dev/null; then
    echo ""
    echo "=================================================="
    echo " ⚠️ OMP не авторизован!"
    echo "=================================================="
    echo "Сейчас откроется интерфейс OMP."
    echo "Авторизуйтесь (OAuth через браузер / Google / Claude / OpenAI)."
    echo "После успешной авторизации выйдите (/exit или Ctrl+C)."
    echo "--------------------------------------------------"
    echo "Нажмите Enter, чтобы запустить OMP..."
    read -r _ || true
    omp || true
    echo "--------------------------------------------------"
    echo "✅ Возврат к запуску Telegram бота."
fi

# 6. Install package dependencies if needed
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing bot dependencies (bun install)..."
    bun install
fi

echo "🚀 Starting OMP Telegram Bot..."
exec bun run src/index.ts "$@"
