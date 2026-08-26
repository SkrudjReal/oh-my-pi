/**
 * Global configuration and environment settings for OMP Telegram Bot.
 */

import * as os from "node:os";
import * as path from "node:path";

export interface BotConfig {
  telegramToken: string;
  allowedUsers: Set<string>;
  adminUsers: Set<string>;
  isPublicMode: boolean;
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
  const allowedRaw = process.env.ALLOWED_TELEGRAM_USERS || "";
  const adminRaw = process.env.ADMIN_TELEGRAM_USERS || "";
  let isPublic: boolean;
  if (overrides?.isPublicMode !== undefined) {
    isPublic = overrides.isPublicMode;
  } else {
    isPublic = allowedRaw.trim() === "*" || allowedRaw.trim() === "";
  }
  const allowedUsers = parseUserList(allowedRaw);
  const adminUsers = parseUserList(adminRaw);

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
    allowedUsers,
    adminUsers,
    isPublicMode: isPublic,
    defaultModel,
    smolModel: process.env.OMP_SMOL_MODEL || process.env.PI_SMOL_MODEL,
    slowModel: process.env.OMP_SLOW_MODEL || process.env.PI_SLOW_MODEL,
    defaultApprovalMode: approvalMode,
    defaultThinkingLevel: overrides?.defaultThinkingLevel || process.env.OMP_THINKING_LEVEL || "low",
    workspaceRoot,
    sessionRoot,
    systemPrompt: overrides?.systemPrompt || process.env.BOT_SYSTEM_PROMPT,
    enableStreaming: overrides?.enableStreaming ?? (process.env.ENABLE_STREAMING !== "false"),
    streamDebounceMs: overrides?.streamDebounceMs ?? Number(process.env.STREAM_DEBOUNCE_MS || 1200),
    enableReactions: overrides?.enableReactions ?? (process.env.ENABLE_REACTIONS !== "false"),
    enableStickers: overrides?.enableStickers ?? (process.env.ENABLE_STICKERS !== "false"),
    enablePremiumEmoji: overrides?.enablePremiumEmoji ?? (process.env.ENABLE_PREMIUM_EMOJI !== "false"),
    maxInputChars: Number(process.env.MAX_INPUT_CHARS || 16384),
    ompExecutable: ompExec,
  };
}

export function isUserAuthorized(userId: number, username: string | undefined, config: BotConfig): boolean {
  if (config.isPublicMode) return true;
  const idStr = String(userId);
  if (config.allowedUsers.has(idStr)) return true;
  if (username && config.allowedUsers.has(username.toLowerCase())) return true;
  if (config.adminUsers.has(idStr)) return true;
  if (username && config.adminUsers.has(username.toLowerCase())) return true;
  return false;
}

export function isUserAdmin(userId: number, username: string | undefined, config: BotConfig): boolean {
  const idStr = String(userId);
  if (config.adminUsers.has(idStr)) return true;
  if (username && config.adminUsers.has(username.toLowerCase())) return true;
  return false;
}
