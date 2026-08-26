/**
 * Magic Filters & Middleware Pipeline for OMP Telegram Bot.
 * Enforces strict Owner, ACL & Forum Topic isolation boundaries.
 */

import type { BotConfig } from "../core/config";
import type { TelegramMessage, TelegramUser } from "../core/types";
import type { TopicManager } from "../services/topics";
import type { TelegramClient } from "./telegram-client";

/**
 * Magic Filter predicates (inspired by aiogram Magic Filters F).
 */
export const F = {
  isOwner: (user: TelegramUser | undefined, config: BotConfig): boolean => {
    if (!user) return false;
    if (config.botOwnerId !== null && user.id === config.botOwnerId) return true;
    return false;
  },

  isAdmin: (user: TelegramUser | undefined, config: BotConfig): boolean => {
    if (!user) return false;
    if (F.isOwner(user, config)) return true;
    const idStr = String(user.id);
    if (config.adminUsers.has(idStr)) return true;
    if (user.username && config.adminUsers.has(user.username.toLowerCase())) return true;
    return false;
  },

  isAuthorized: (user: TelegramUser | undefined, config: BotConfig): boolean => {
    if (!user) return false;
    if (config.isPublicMode) return true;
    if (F.isOwner(user, config)) return true;
    const idStr = String(user.id);
    if (config.allowedUsers.has(idStr)) return true;
    if (user.username && config.allowedUsers.has(user.username.toLowerCase())) return true;
    if (config.adminUsers.has(idStr)) return true;
    if (user.username && config.adminUsers.has(user.username.toLowerCase())) return true;
    return false;
  },

  isPrivateChat: (message: TelegramMessage): boolean => {
    return message.chat.type === "private";
  },

  isGroupChat: (message: TelegramMessage): boolean => {
    return message.chat.type === "group" || message.chat.type === "supergroup";
  },

  hasCommand: (message: TelegramMessage, commandName: string): boolean => {
    const text = (message.text || message.caption || "").trim();
    if (!text.startsWith("/")) return false;
    const cmd = text.split(/\s+/)[0].toLowerCase().split("@")[0];
    return cmd === `/${commandName.toLowerCase().replace(/^\//, "")}`;
  },
};

/**
 * Strict Owner, ACL & Topic Authentication Middleware.
 * Intercepts incoming messages before any command or agent execution.
 */
export async function authenticateUpdate(
  message: TelegramMessage,
  config: BotConfig,
  client: TelegramClient,
  topicManager?: TopicManager,
): Promise<boolean> {
  const user = message.from;
  const isPrivate = F.isPrivateChat(message);

  // 1. Group / Forum Supergroup Thread Routing
  if (!isPrivate) {
    const text = (message.text || message.caption || "").trim();
    // Allow topic management commands from admins/owners
    if (text.startsWith("/topic") || text.startsWith("/topics")) {
      return F.isAdmin(user, config) || F.isOwner(user, config);
    }

    // Check if the current thread/topic is registered and active
    if (topicManager) {
      const isTopicActive = await topicManager.isTopicActive(
        message.chat.id,
        message.message_thread_id,
      );
      if (!isTopicActive) {
        // Silently drop messages from unconfigured group threads
        return false;
      }
    }
    return true;
  }

  // 2. Private Chat Authorization
  const isAllowed = F.isAuthorized(user, config);
  if (!isAllowed) {
    const userId = user?.id || 0;
    const username = user?.username ? `@${user.username}` : "Unknown";
    console.warn(`🔒 Unauthorized access attempt from User ID: ${userId} (${username}) in Chat: ${message.chat.id}`);

    try {
      await client.sendMessage(
        message.chat.id,
        '<blockquote><tg-emoji emoji-id="5305423313764363203">🤫</tg-emoji> <b>Доступ ограничен</b>\nЭтот бот работает в приватном режиме строго для своего владельца.</blockquote>',
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
    } catch {
      // Ignored if unable to reply
    }

    return false;
  }

  return true;
}
