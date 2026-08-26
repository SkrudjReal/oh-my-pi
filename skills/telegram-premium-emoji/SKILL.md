---
name: telegram-premium-emoji
description: "Universal Telegram formatting, premium custom emoji, reactions (<tg-react>), stickers (<tg-sticker>), and emotional delivery skill for AI agents on Telegram."
version: 2.1.0
author: Antigravity / OMP
license: MIT
platforms: [linux, macos, wsl, telegram]
metadata:
  tags: [telegram, premium-emoji, custom-emoji, reactions, formatting, stickers, emotional-intelligence]
---

# Universal Telegram Premium Emoji, Reactions & Rich Formatting Skill

Use this skill when interacting with users on Telegram to produce high-engagement, visually appealing, and emotionally nuanced responses using native Telegram HTML, Premium Custom Emojis, Reactions, and Stickers.

---

## 1. Telegram Premium Custom Emoji Markup

You can render native Telegram Premium Custom Emojis using `<tg-emoji emoji-id="...">char</tg-emoji>`. Use them organically (1–3 per message) to highlight key milestones, achievements, greetings, or humor:

### Verified Custom Emoji Catalog:
- **Success / Done / Top Quality:** `<tg-emoji emoji-id="5336824751673343377">👌</tg-emoji>` or `<tg-emoji emoji-id="5456184310895748720">✨</tg-emoji>`
- **Greetings / Warmth:** `<tg-emoji emoji-id="5300994163100119559">🌸</tg-emoji>` or `<tg-emoji emoji-id="5305602448260345544">☺️</tg-emoji>`
- **Wink / Playful / Smart:** `<tg-emoji emoji-id="5303115434562695167">😉</tg-emoji>`
- **Love / Appreciation / Hearts:** `<tg-emoji emoji-id="6136716054971291812">💖</tg-emoji>`
- **Star / Highlight:** `<tg-emoji emoji-id="5359450562079242286">🌟</tg-emoji>`
- **Celebration / Milestone:** `<tg-emoji emoji-id="5458792537160452834">🎆</tg-emoji>`
- **Docs / Code / Research:** `<tg-emoji emoji-id="5363859217159582224">📖</tg-emoji>`
- **Relax / Chill / Coffee:** `<tg-emoji emoji-id="5305267075739037458">☕</tg-emoji>`
- **Secret / Stealth:** `<tg-emoji emoji-id="5305423313764363203">🤫</tg-emoji>`

---

## 2. Interactive Message Reactions (`<tg-react emoji="..."/>`)

Include `<tg-react emoji="..."/>` tags anywhere in your response to automatically react to the user's triggering message.

### Standard Reactions:
1. `🔥` or `⚡` — High excitement, brilliant idea, clean code win, lightning speed.
2. `❤` or `🥰` — Warmth, empathy, gratitude, heartfelt conversation.
3. `👍` — Clear acknowledgment, task completed, direct agreement.
4. `🤡` — Playful irony, absurdity, funny bugs, or self-deprecating humor.
5. `🎉` — Celebration, successful deployment, new release.

*Example:*
```html
<tg-react emoji="🔥"/>
All unit tests passed with 100% code coverage! <tg-emoji emoji-id="5336824751673343377">👌</tg-emoji>
```

---

## 3. Intuitive Sticker Dispatching (`<tg-sticker tag="..."/>`)

Include `<tg-sticker tag="..."/>` to trigger sending a sticker to the chat.
- **Rule of Thumb:** Use sparingly (1 sticker every 3–5 messages) at moments of high emotion, milestone celebrations, or witty conclusions.
- **Tags:** `heart`, `celebration`, `thinking`, `thumbsup`, `cute`, `party`.

*Example:*
```html
<tg-sticker tag="celebration"/>
Your deployment is live and healthy on production!
```

---

## 4. Markdown & HTML Formatting Guidelines

- **Code:** Always wrap code blocks with language identifiers (e.g. ` ```typescript `) or inline `<code>code</code>`.
- **Headers:** Prefer bold `<b>Section Title</b>` rather than giant markdown headers for cleaner mobile rendering.
- **Spoilers:** Use `<tg-spoiler>hidden content</tg-spoiler>` or `||hidden||` for secrets or surprises.
- **Quotes:** Use `<blockquote>...</blockquote>` or `> ...` for quoting reference material.
- **Tables:** Markdown tables are automatically converted to readable mobile card groups.
