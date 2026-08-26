# @oh-my-pi/pi-telegram-bot

Universal Telegram Bot interface, streaming bridge, and rich interaction layer for the **Oh My Pi (`omp`)** AI Coding Agent.

Inspired by the best features of **Geminka Agent** (dynamic emotional intelligence, live streaming, reaction/sticker extraction, and Telegram Premium custom emoji) and **Hermes Agent** (robust message splitting, forum topics, attachment handling, and production resilience).

---

## ✨ Features

- ⚡ **Real-Time Live Streaming:** Progressive token streaming & live tool execution badges (`⚙️ bash`, `📖 read`, `✏️ edit`, `📝 write`, `🔍 search`, `🌐 web_search`, `🤖 subagent`).
- 📁 **Per-Chat Session & Workspace Isolation:** Every Telegram chat and topic gets an isolated session history and dedicated workspace directory for file modifications and downloads.
- 🎨 **Rich Telegram HTML & Table Formatting:** Automatically translates GitHub Flavored Markdown to compliant Telegram HTML, formats code blocks with syntax tags, and converts GFM tables into sleek mobile-friendly cards.
- 💎 **Telegram Premium Custom Emojis:** Native support for rendering `<tg-emoji emoji-id="...">char</tg-emoji>` custom emojis.
- 🔥 **Reaction & Sticker Dispatching:** Automatically parses `<tg-react emoji="...">` and `<tg-sticker tag="...">` tags from LLM responses and dispatches native Telegram reactions and stickers.
- 🧠 **Thinking / Reasoning Suppression:** Automatically hides `<think>...</think>` internal scratchpad blocks from user-visible outputs while streaming.
- 📎 **Multi-Modal Attachment Support:** Automatically downloads incoming images, documents, and audio notes into the chat workspace and links them for the agent.
- 🛡 **Security & Access Control (ACL):** Flexible whitelist and admin user filtering, or public mode with customizable tool approval policies (`yolo`, `write`, `always-ask`).
- 🛑 **Task Cancellation:** Live task interruption via `/cancel` command or signal aborts.

---

## 🚀 Quick Start

### 1. Run via CLI Subcommand (within OMP)
```bash
omp telegram --token="<YOUR_BOT_TOKEN>" --model="google-antigravity/gemini-3.7-flash" --public
```

### 2. Standalone Runner with Bun
```bash
cd packages/telegram-bot
export TELEGRAM_BOT_TOKEN="<YOUR_BOT_TOKEN>"
export OMP_MODEL="google-antigravity/gemini-3.7-flash"
bun run start
```

### 3. Deploy with Docker Compose
```bash
cp .env.example .env
# Edit .env with your TELEGRAM_BOT_TOKEN
docker compose up -d
```

---

## ⚙️ Configuration Reference

All settings can be configured via environment variables or a `.env` file:

| Parameter | Type | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | string | *required* | Telegram Bot API Token from @BotFather |
| `ALLOWED_TELEGRAM_USERS` | string | `*` | Comma-separated user IDs/usernames (`*` for all) |
| `ADMIN_TELEGRAM_USERS` | string | *empty* | Comma-separated admin IDs for elevated commands |
| `OMP_MODEL` | string | `gemini-3.7-flash` | Default LLM model |
| `OMP_AUTO_APPROVE` | string | `yolo` | Tool approval mode: `yolo`, `write`, `always-ask` |
| `OMP_THINKING_LEVEL` | string | `low` | Model thinking level (`off`, `low`, `medium`, `high`) |
| `OMP_WORKSPACE_ROOT` | string | `~/.omp/telegram-workspaces` | Directory for per-chat file workspaces |
| `OMP_SESSION_ROOT` | string | `~/.omp/telegram-sessions` | Directory for per-chat session storage |
| `ENABLE_STREAMING` | boolean | `true` | Enable live progressive message editing |
| `STREAM_DEBOUNCE_MS` | number | `1200` | Minimum delay between Telegram message edits |
| `ENABLE_REACTIONS` | boolean | `true` | Enable automated reaction dispatching |
| `ENABLE_STICKERS` | boolean | `true` | Enable automated sticker dispatching |
| `ENABLE_PREMIUM_EMOJI` | boolean | `true` | Enable Telegram Premium custom emojis |
| `BOT_SYSTEM_PROMPT` | string | *none* | Custom persona or system instructions override |

---

## 📱 Bot Commands

- `/start` — Welcome message, overview, and quick status.
- `/help` — Full command list and markup guide.
- `/new` or `/clear` or `/reset` — Wipe conversation memory and start a fresh context.
- `/model <name>` — View or switch the active LLM model.
- `/mode <yolo|write|always-ask>` — Set tool approval level.
- `/status` — View uptime, token usage, cost estimates, and workspace info.
- `/cancel` — Terminate any active agent execution immediately.

---

## 🧪 Testing

Run the test suite with Bun:
```bash
bun test
```
