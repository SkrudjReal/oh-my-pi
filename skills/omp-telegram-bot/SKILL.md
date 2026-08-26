---
name: omp-telegram-bot
description: "Deploy, configure, and operate a universal Telegram Bot for Oh My Pi (omp) AI coding agent with real-time streaming, session isolation, rich HTML/custom emoji formatting, and full tool execution."
version: 1.0.0
author: Antigravity / OMP
license: MIT
platforms: [linux, macos, wsl, telegram]
metadata:
  tags: [telegram, bot, omp, streaming, agent, deployment, automation]
---

# OMP Telegram Bot Deployment & Operation Skill

Use this skill when you need to deploy, configure, customize, or maintain a Telegram Bot interface for the **Oh My Pi (`omp`)** AI coding agent.

---

## 1. Architecture Overview

The OMP Telegram Bot bridges Telegram users and groups directly to the `omp` agent runtime with:
- **Real-Time Streaming:** Progressive token streaming & live tool execution badges (`⚙️ bash`, `📖 read`, `✏️ edit`, `📝 write`, `🔍 search`).
- **Session & Workspace Isolation:** Each chat ID gets its own dedicated session context (`~/.omp/telegram-sessions/<chat_id>`) and isolated workspace directory (`~/.omp/telegram-workspaces/<chat_id>`).
- **Rich Telegram Formatting:** GFM Markdown converted to Telegram HTML, code blocks, spoilers, blockquotes, mobile-friendly table cards, and Telegram Premium custom emojis.
- **Interactive Control Tags:**
  - Reactions: `<tg-react emoji="🔥"/>`, `<tg-react emoji="❤"/>`
  - Stickers: `<tg-sticker tag="heart"/>`
  - Custom Emojis: `<tg-emoji emoji-id="...">✨</tg-emoji>`
  - Reasoning suppression: `<think>...</think>` stripped from user output.
- **Multi-Modal Attachments:** Inbound photos and documents are automatically downloaded into the workspace and referenced in agent prompts (`@downloads/photo.jpg`).
- **Security & Authorization (ACL):** Whitelist-based or public access mode, admin commands, and tool execution approval modes (`yolo`, `write`, `always-ask`).

---

## 2. Quick Deployment (1-Command)

### Option A: Using the CLI Subcommand
```bash
omp telegram --token="<YOUR_TELEGRAM_BOT_TOKEN>" --model="google-antigravity/gemini-3.7-flash" --public
```

### Option B: Using Standalone Runner via Bun
```bash
cd packages/telegram-bot
export TELEGRAM_BOT_TOKEN="<YOUR_TELEGRAM_BOT_TOKEN>"
export OMP_MODEL="google-antigravity/gemini-3.7-flash"
bun run start
```

---

## 3. Configuration Reference (`.env`)

Create a `.env` file or export environment variables:

| Variable | Description | Default |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Bot API Token from @BotFather | **Required** |
| `ALLOWED_TELEGRAM_USERS` | Comma-separated user IDs or usernames (`*` for public) | `*` (public) |
| `ADMIN_TELEGRAM_USERS` | Comma-separated admin user IDs or usernames | Empty |
| `OMP_MODEL` | Default model for conversations | `google-antigravity/gemini-3.7-flash` |
| `OMP_AUTO_APPROVE` | Tool approval mode (`yolo`, `write`, `always-ask`) | `yolo` |
| `OMP_THINKING_LEVEL` | Model thinking level (`off`, `low`, `medium`, `high`) | `low` |
| `OMP_WORKSPACE_ROOT` | Base directory for per-chat workspaces | `~/.omp/telegram-workspaces` |
| `OMP_SESSION_ROOT` | Base directory for per-chat session histories | `~/.omp/telegram-sessions` |
| `ENABLE_STREAMING` | Enable progressive live message editing | `true` |
| `STREAM_DEBOUNCE_MS` | Throttle time between Telegram message edits (ms) | `1200` |
| `ENABLE_REACTIONS` | Enable automated message reactions | `true` |
| `ENABLE_STICKERS` | Enable automated sticker responses | `true` |
| `ENABLE_PREMIUM_EMOJI` | Enable Telegram Premium custom emoji parsing | `true` |
| `BOT_SYSTEM_PROMPT` | Custom persona or system instructions override | Default OMP prompt |

---

## 4. Production Service Deployment

### A. Systemd Service (Linux/Debian/Ubuntu)

1. Create `/etc/systemd/system/omp-telegram.service`:
```ini
[Unit]
Description=Oh My Pi Telegram Bot Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/oh-my-pi/packages/telegram-bot
Environment=TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
Environment=OMP_MODEL=google-antigravity/gemini-3.7-flash
Environment=OMP_AUTO_APPROVE=yolo
ExecStart=/usr/local/bin/bun run src/index.ts
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

2. Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now omp-telegram
sudo systemctl status omp-telegram
```

### B. Docker Compose

```yaml
version: "3.8"

services:
  omp-telegram-bot:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: omp-telegram-bot
    restart: unless-stopped
    environment:
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - OMP_MODEL=${OMP_MODEL:-google-antigravity/gemini-3.7-flash}
      - OMP_AUTO_APPROVE=yolo
    volumes:
      - omp_sessions:/root/.omp/telegram-sessions
      - omp_workspaces:/root/.omp/telegram-workspaces

volumes:
  omp_sessions:
  omp_workspaces:
```

---

## 5. Built-In Bot Commands

- `/start` — Welcome banner, status, and active configuration.
- `/help` — Full command list and markup guide.
- `/new`, `/clear`, `/reset` — Wipe session history and start fresh context.
- `/model <model_name>` — Switch model for the current chat (e.g. `gemini-3.7-flash`, `claude-3-7-sonnet`, `gpt-4o`).
- `/mode <yolo|write|always-ask>` — Change tool approval policy.
- `/status` — View uptime, token usage, workspace path, active model.
- `/cancel` — Stop any currently running task immediately.
