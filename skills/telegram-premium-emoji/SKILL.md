---
name: telegram-premium-emoji
description: "Universal Telegram Premium emoji, custom reactions (<tg-react>), stickers (<tg-sticker>), and aesthetic blockquote formatting skill for AI agents."
version: 3.0.0
author: Antigravity / OMP
license: MIT
platforms: [linux, macos, wsl, telegram]
metadata:
  tags: [telegram, premium-emoji, custom-emoji, reactions, formatting, stickers, aura_maogui, tgcolor2Emoji, blockquote]
---

# Universal Telegram Premium Emoji, Reactions & Blockquote Styling Skill

Use this skill when interacting with users on Telegram to produce high-engagement, visually stunning, and structured responses using **Telegram Premium Custom Emojis**, native **HTML Blockquotes**, **Reactions**, and **Stickers**.

---

## 1. Verified Custom Emoji Packs Catalog

### Pack A: `aura_maogui` (https://t.me/addemoji/aura_maogui)
*Aesthetic pastel & aura custom emojis for emotions, highlights, and status:*

* **Hearts & Affection:**
  * Pink Sparkle Heart: `<tg-emoji emoji-id="6136716054971291812">💖</tg-emoji>`
  * Blue Aura Heart: `<tg-emoji emoji-id="6136173424508146905">💙</tg-emoji>`
  * White Pure Heart: `<tg-emoji emoji-id="6136594580411258751">🤍</tg-emoji>`
  * Purple Neon Heart: `<tg-emoji emoji-id="6136436598629209942">💜</tg-emoji>`
  * Yellow Aura Heart: `<tg-emoji emoji-id="6136400971875490032">💛</tg-emoji>`
  * Beating Heart: `<tg-emoji emoji-id="6136619529876280416">💓</tg-emoji>`
* **Sparkles & Stars (Success & Polish):**
  * Gold Shimmer Sparkle: `<tg-emoji emoji-id="6136155901041578903">✨</tg-emoji>`
  * Glowing Star: `<tg-emoji emoji-id="6136441086870033177">🌟</tg-emoji>`
  * Dizzy Star Swirl: `<tg-emoji emoji-id="6138688273888842147">💫</tg-emoji>`
* **Energy, Quality & Status:**
  * Cyan Lightning Bolt: `<tg-emoji emoji-id="6138837841829957663">⚡️</tg-emoji>`
  * Royal Crown: `<tg-emoji emoji-id="6136387648886935976">👑</tg-emoji>`
  * Verified Diamond: `<tg-emoji emoji-id="6136408896090150077">💎</tg-emoji>`
  * Checkmark / Done: `<tg-emoji emoji-id="6138879610386912023">✅</tg-emoji>`
  * Writing / Coding: `<tg-emoji emoji-id="6136251919330449174">✍️</tg-emoji>`
* **Aura Butterfly & Aesthetics:**
  * Cyan Butterfly: `<tg-emoji emoji-id="6136257464133228971">🦋</tg-emoji>`
  * Pastel Butterfly: `<tg-emoji emoji-id="6138489610176567084">🦋</tg-emoji>`
* **Celebration & Atmosphere:**
  * Cheers Glasses: `<tg-emoji emoji-id="6136585685533986833">🥂</tg-emoji>`
  * Party Balloon: `<tg-emoji emoji-id="6138564196578629134">🎈</tg-emoji>`
  * Love Letter: `<tg-emoji emoji-id="6136431745316164849">💌</tg-emoji>`

---

### Pack B: `tgcolor2Emoji` (https://t.me/addemoji/tgcolor2Emoji)
*Vibrant color-coordinated UI elements, icons, folders, and indicators:*

* **Documentation & Books:**
  * Cyan Book: `<tg-emoji emoji-id="5348202175875016422">📖</tg-emoji>`
  * Purple Book: `<tg-emoji emoji-id="5350727663889708002">📖</tg-emoji>`
  * Pink Book: `<tg-emoji emoji-id="5348449183739180542">📖</tg-emoji>`
* **Folders & Files:**
  * Neon Blue Folder: `<tg-emoji emoji-id="5348222744473398688">📁</tg-emoji>`
  * Purple Folder: `<tg-emoji emoji-id="5350726860730821119">📁</tg-emoji>`
* **Fire & Speed:**
  * Violet Flame: `<tg-emoji emoji-id="5350400112503845756">🔥</tg-emoji>`
  * Orange Flame: `<tg-emoji emoji-id="5348495427652053799">🔥</tg-emoji>`
* **Pencils & Editing:**
  * Cyan Pencil: `<tg-emoji emoji-id="5348318754172331709">✏️</tg-emoji>`
  * Purple Pencil: `<tg-emoji emoji-id="5350448452360758866">✏️</tg-emoji>`
* **Crystals & Gems:**
  * Cyan Crystal: `<tg-emoji emoji-id="5348405014295506484">💎</tg-emoji>`
  * Violet Crystal: `<tg-emoji emoji-id="5348576727088000746">💎</tg-emoji>`
* **Ribbons & Sweet Vibes:**
  * Pink Ribbon: `<tg-emoji emoji-id="5350586578508997678">🎀</tg-emoji>`
  * Sweet Cake: `<tg-emoji emoji-id="5348184944466230619">🍰</tg-emoji>`
  * Magical Unicorn: `<tg-emoji emoji-id="5348422915719197183">🦄</tg-emoji>`
* **Finance & Token Usage:**
  * Money with Wings: `<tg-emoji emoji-id="5350809706354993830">💸</tg-emoji>`

---

## 2. Blockquote Formatting & Visual Hierarchy Rules

To make responses look clean, elegant, and readable on mobile Telegram clients:

1. **Use Blockquotes for Key Insights & Highlights:**
   Wrap important summaries, takeaways, warnings, or quotes inside `<blockquote>...</blockquote>` (or markdown `> ...`).
2. **Accentuate with Premium Emojis:**
   Place 1 custom emoji at the start of a blockquote or section header.
3. **Keep Regular Text Clean:**
   Do not overload every single sentence with emojis (optimal is 1–3 custom emojis per message).

### Example Response Layout:

```html
<tg-react emoji="🔥"/>
<b>🚀 Релиз и деплой успешно завершены!</b> <tg-emoji emoji-id="5336824751673343377">👌</tg-emoji>

<blockquote>
<tg-emoji emoji-id="6138879610386912023">✅</tg-emoji> Все 17 автоматических тестов пройдены без единой ошибки.<br>
<tg-emoji emoji-id="5348222744473398688">📁</tg-emoji> Сборка упакована в production bundle и готова к работе.
</blockquote>

<tg-emoji emoji-id="5348202175875016422">📖</tg-emoji> <b>Что было изменено:</b>
• Добавлена строгая проверка прав через Magic Filters
• Подключена живая трансляция выполнения команд через Live Streaming
• Настроено меню команд <code>setMyCommands</code> в Telegram

<blockquote>
<tg-emoji emoji-id="5305423313764363203">🤫</tg-emoji> <i>Совет: Для управления ботом используйте команду /start или встроенные inline-кнопки.</i>
</blockquote>
```

---

## 3. Interactive Reaction & Sticker Tags

- **Reactions:** Insert `<tg-react emoji="🔥"/>` (or `❤`, `⚡`, `👍`, `🎉`) anywhere in the response. The bot dispatches the native Telegram reaction to the user's message.
- **Stickers:** Insert `<tg-sticker tag="celebration"/>` or `<tg-sticker tag="heart"/>` for visual accents at emotional peaks.
