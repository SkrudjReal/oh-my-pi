#!/usr/bin/env bash
set -euo pipefail

# Ensure standard binary directories are in PATH
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

# 2. Check / Install OMP Agent via official installer
if ! command -v omp &> /dev/null; then
    echo "📦 OMP CLI not found. Installing Oh My Pi (omp.sh)..."
    curl -fsSL https://omp.sh/install | sh
    export PATH="$HOME/.bun/bin:$HOME/.local/bin:/usr/local/bin:$PATH"
fi

if command -v omp &> /dev/null; then
    echo "✅ OMP CLI found: $(which omp) ($(omp --version 2>/dev/null || echo 'installed'))"
else
    echo "⚠️ Warning: 'omp' command not found in PATH, trying bun add -g @oh-my-pi/pi-coding-agent..."
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
    echo "⚠️ .env file not found. Copying .env.example -> .env..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "📝 Created .env file. Please edit it with your bot token and settings."
fi

# 4. Check Telegram Bot Token
if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ "${TELEGRAM_BOT_TOKEN:-}" = "YOUR_TELEGRAM_BOT_TOKEN_HERE" ]; then
    echo ""
    echo "❌ Error: TELEGRAM_BOT_TOKEN is not configured in .env!"
    echo "Please open .env and set your token from @BotFather:"
    echo "  nano $SCRIPT_DIR/.env"
    exit 1
fi

# 5. Check OMP Authentication / API Keys
echo "🔑 Checking OMP authentication status..."
HAS_AUTH=0

if [ -n "${GEMINI_API_KEY:-}" ] || [ -n "${OPENAI_API_KEY:-}" ] || [ -n "${ANTHROPIC_API_KEY:-}" ] || [ -n "${OPENROUTER_API_KEY:-}" ] || [ -n "${DEEPSEEK_API_KEY:-}" ]; then
    HAS_AUTH=1
fi

if omp usage &> /dev/null; then
    HAS_AUTH=1
fi

if [ "$HAS_AUTH" -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo " ⚠️ OMP не авторизован ни через OAuth, ни через API-ключи!"
    echo "=================================================="
    echo "Для работы агенту нужен доступ к модели (Gemini, Claude, OpenAI и др.)."
    echo ""
    echo "Выберите способ авторизации:"
    echo "  1) Запустить интерактивный вход в OMP прямо сейчас (OAuth Google Antigravity / Claude / OpenAI)"
    echo "  2) Указать API-ключ в файле .env (GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY)"
    echo "  3) Пропустить и продолжить запуск"
    echo ""
    read -r -p "Введите номер [1/2/3] (по умолчанию 1): " auth_choice || auth_choice="1"
    auth_choice=${auth_choice:-1}

    if [ "$auth_choice" = "1" ]; then
        echo ""
        echo "🚀 Запуск OMP... Авторизуйтесь через меню или выберите провайдера, затем закройте (/exit или Ctrl+C):"
        echo "--------------------------------------------------"
        omp || true
        echo "--------------------------------------------------"
        echo "✅ Авторизация OMP завершена."
    elif [ "$auth_choice" = "2" ]; then
        echo ""
        echo "📝 Откройте .env и укажите ваш ключ:"
        echo "  nano $SCRIPT_DIR/.env"
        echo "Затем повторно запустите ./deploy.sh"
        exit 0
    fi
fi

# 6. Install package dependencies if needed
cd "$SCRIPT_DIR"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing bot dependencies..."
    bun install
fi

echo "🚀 Starting OMP Telegram Bot..."
exec bun run src/index.ts "$@"
