/**
 * Global configuration and environment loader for OMP Telegram Bot.
 */

import * as os from "node:os";
import * as path from "node:path";

export interface BotConfig {
  telegramToken: string;
  botOwnerId: number | null;
  allowedUsers: Set<string>;
  adminUsers: Set<string>;
  isPublicMode: boolean;
  strictOwnerOnly: boolean;
  defaultModel: string;
  smolModel?: string;
  slowModel?: string;
  defaultApprovalMode: "yolo" | "write" | "always-ask";
  defaultThinkingLevel: string;
  workspaceRoot: string;
  sessionRoot: string;
  systemPrompt?: string;
  enableStreaming: boolean;
  streamDebounceMs: number;
  enableReactions: boolean;
  enableStickers: boolean;
  enablePremiumEmoji: boolean;
  maxInputChars: number;
  ompExecutable: string;
}

export const DEFAULT_TELEGRAM_SYSTEM_PROMPT = `
## 🌟 CRITICAL TELEGRAM INTERACTION & FORMATTING CONTRACT:
You are an intelligent, friendly, and highly capable AI assistant and coding partner operating inside Telegram via Oh My Pi (omp).

1. **ALWAYS USE TELEGRAM PREMIUM CUSTOM EMOJIS BY DEFAULT:**
   In EVERY response, naturally include 1–3 Telegram Premium Custom Emojis (<tg-emoji emoji-id="...">char</tg-emoji>) from the verified catalog below. Never omit them.
2. **BLOCKQUOTES WITHOUT INTERNAL NEWLINES (<blockquote>text</blockquote>):**
   Wrap main summaries, conclusions, takeaways, statuses, code explanations, or key steps in blockquotes decorated with custom emojis.
   DO NOT add leading or trailing \\n inside blockquote tags. For long text (>180 chars or >=4 lines), use <blockquote expandable>text</blockquote>.
3. **STRICT REACTION RULES (1/10 RATE):**
   Only 4 reactions are allowed: <tg-react emoji="❤"/>, <tg-react emoji="👍"/>, <tg-react emoji="🔥"/>, <tg-react emoji="👎"/>. Use them sparingly (~1 in 10 messages).
4. **USE NATIVE TELEGRAM HTML FORMATTING:**
   Use <b>bold</b>, <i>italic</i>, <code>code</code>, <pre><code class="language-...">code block</code></pre>, <tg-spoiler>spoiler</tg-spoiler>, <blockquote>quote</blockquote>.

### 💎 VERIFIED CUSTOM EMOJI CATALOG:
- Sparkles & Stars: <tg-emoji emoji-id="6136155901041578903">✨</tg-emoji>, <tg-emoji emoji-id="6136441086870033177">🌟</tg-emoji>, <tg-emoji emoji-id="6138688273888842147">💫</tg-emoji>
- Hearts & Warmth: <tg-emoji emoji-id="6136716054971291812">💖</tg-emoji>, <tg-emoji emoji-id="6136173424508146905">💙</tg-emoji>, <tg-emoji emoji-id="6136594580411258751">🤍</tg-emoji>, <tg-emoji emoji-id="6136436598629209942">💜</tg-emoji>
- Quality & Crowns: <tg-emoji emoji-id="6136408896090150077">💎</tg-emoji>, <tg-emoji emoji-id="6136387648886935976">👑</tg-emoji>, <tg-emoji emoji-id="6138879610386912023">✅</tg-emoji>
- Energy & Speed: <tg-emoji emoji-id="6138837841829957663">⚡️</tg-emoji>, <tg-emoji emoji-id="5350400112503845756">🔥</tg-emoji>
- Coding & Workspace: <tg-emoji emoji-id="5348202175875016422">📖</tg-emoji>, <tg-emoji emoji-id="5348318754172331709">✏️</tg-emoji>, <tg-emoji emoji-id="5348222744473398688">📁</tg-emoji>, <tg-emoji emoji-id="6136251919330449174">✍️</tg-emoji>
- Aesthetics & Ribbon: <tg-emoji emoji-id="6136257464133228971">🦋</tg-emoji>, <tg-emoji emoji-id="5350586578508997678">🎀</tg-emoji>, <tg-emoji emoji-id="5348184944466230619">🍰</tg-emoji>
- Celebration: <tg-emoji emoji-id="6136585685533986833">🥂</tg-emoji>, <tg-emoji emoji-id="6138564196578629134">🎈</tg-emoji>, <tg-emoji emoji-id="6136431745316164849">💌</tg-emoji>
- Secret / Tip: <tg-emoji emoji-id="5305423313764363203">🤫</tg-emoji>
`.trim();

function parseUserList(raw?: string): Set<string> {
  if (!raw || raw.trim() === "") return new Set();
  const set = new Set<string>();
  for (const part of raw.split(",")) {
    const trimmed = part.trim().toLowerCase().replace(/^@/, "");
    if (trimmed) set.add(trimmed);
  }
  return set;
}

export function loadConfig(overrides?: Partial<BotConfig>): BotConfig {
  const home = os.homedir();
  const token = overrides?.telegramToken || process.env.TELEGRAM_BOT_TOKEN || "";

  const ownerIdRaw = process.env.BOT_OWNER_ID || process.env.OWNER_ID || "";
  const botOwnerId = overrides?.botOwnerId ?? (ownerIdRaw.trim() ? Number(ownerIdRaw.trim()) : null);

  const allowedRaw = process.env.ALLOWED_TELEGRAM_USERS || "";
  const adminRaw = process.env.ADMIN_TELEGRAM_USERS || "";

  let isPublic: boolean;
  if (overrides?.isPublicMode !== undefined) {
    isPublic = overrides.isPublicMode;
  } else if (botOwnerId !== null) {
    // If BOT_OWNER_ID is explicitly configured, default to private/strict mode
    isPublic = allowedRaw.trim() === "*";
  } else {
    isPublic = allowedRaw.trim() === "*" || allowedRaw.trim() === "";
  }

  const allowedUsers = parseUserList(allowedRaw);
  const adminUsers = parseUserList(adminRaw);

  if (botOwnerId !== null) {
    allowedUsers.add(String(botOwnerId));
    adminUsers.add(String(botOwnerId));
  }

  const defaultModel =
    overrides?.defaultModel ||
    process.env.OMP_MODEL ||
    process.env.PI_DEFAULT_MODEL ||
    "google-antigravity/gemini-3.7-flash";

  const workspaceRoot =
    overrides?.workspaceRoot ||
    process.env.OMP_WORKSPACE_ROOT ||
    path.join(home, ".omp", "telegram-workspaces");

  const sessionRoot =
    overrides?.sessionRoot ||
    process.env.OMP_SESSION_ROOT ||
    path.join(home, ".omp", "telegram-sessions");

  const approvalMode =
    (overrides?.defaultApprovalMode ||
      process.env.OMP_AUTO_APPROVE ||
      "yolo") as "yolo" | "write" | "always-ask";

  const ompExec = overrides?.ompExecutable || process.env.OMP_BIN || "omp";

  return {
    telegramToken: token,
    botOwnerId,
    allowedUsers,
    adminUsers,
    isPublicMode: isPublic,
    strictOwnerOnly: botOwnerId !== null && !isPublic,
    defaultModel,
    smolModel: process.env.OMP_SMOL_MODEL || process.env.PI_SMOL_MODEL,
    slowModel: process.env.OMP_SLOW_MODEL || process.env.PI_SLOW_MODEL,
    defaultApprovalMode: approvalMode,
    defaultThinkingLevel: overrides?.defaultThinkingLevel || process.env.OMP_THINKING_LEVEL || "low",
    workspaceRoot,
    sessionRoot,
    systemPrompt: overrides?.systemPrompt ?? (process.env.BOT_SYSTEM_PROMPT || DEFAULT_TELEGRAM_SYSTEM_PROMPT),
    enableStreaming: overrides?.enableStreaming ?? (process.env.ENABLE_STREAMING !== "false"),
    streamDebounceMs: overrides?.streamDebounceMs ?? Number(process.env.STREAM_DEBOUNCE_MS || 1200),
    enableReactions: overrides?.enableReactions ?? (process.env.ENABLE_REACTIONS !== "false"),
    enableStickers: overrides?.enableStickers ?? (process.env.ENABLE_STICKERS !== "false"),
    enablePremiumEmoji: overrides?.enablePremiumEmoji ?? (process.env.ENABLE_PREMIUM_EMOJI !== "false"),
    maxInputChars: Number(process.env.MAX_INPUT_CHARS || 16384),
    ompExecutable: ompExec,
  };
}
