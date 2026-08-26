/**
 * Telegram Bot Command Menu Registration.
 * Configures the native Telegram command popup menu for users and owners.
 */

import type { BotConfig } from "../core/config";
import type { TelegramBotCommand } from "../core/types";
import type { TelegramClient } from "./telegram-client";

export const USER_COMMANDS: TelegramBotCommand[] = [
  { command: "start", description: "🚀 Главное меню и статус" },
  { command: "new", description: "🧹 Сбросить контекст диалога" },
  { command: "model", description: "🎯 Сменить модель LLM" },
  { command: "mode", description: "🛡 Режим аппрува инструментов" },
  { command: "thinking", description: "🧠 Уровень размышлений (thinking)" },
  { command: "status", description: "📊 Статус сессии и расход токенов" },
  { command: "tools", description: "🛠 Список инструментов агента" },
  { command: "skills", description: "🧩 Список активных скиллов" },
  { command: "cancel", description: "🛑 Прервать текущую задачу" },
  { command: "help", description: "📖 Полное руководство и команды" },
];

export const OWNER_COMMANDS: TelegramBotCommand[] = [
  ...USER_COMMANDS,
  { command: "workspace", description: "📁 Воркспейс и файлы чата" },
  { command: "compact", description: "🗜 Сжать контекст сессии (Snapcompact)" },
  { command: "stats", description: "📈 Расширенная аналитика" },
];

export async function setBotCommands(client: TelegramClient, config: BotConfig): Promise<void> {
  try {
    // 1. Default fallback scope
    await client.setMyCommands(USER_COMMANDS, { type: "default" });

    // 2. All private chats scope
    await client.setMyCommands(USER_COMMANDS, { type: "all_private_chats" });

    // 3. Chat-specific scope for the owner
    if (config.botOwnerId !== null) {
      await client.setMyCommands(OWNER_COMMANDS, {
        type: "chat",
        chat_id: config.botOwnerId,
      });
      console.log(`✨ Registered owner command menu for ID: ${config.botOwnerId}`);
    }

    console.log("✅ Telegram command menu successfully configured.");
  } catch (err) {
    console.error("Failed to register Telegram bot commands:", err);
  }
}

export async function delBotCommands(client: TelegramClient, config: BotConfig): Promise<void> {
  try {
    await client.deleteMyCommands({ type: "default" });
    await client.deleteMyCommands({ type: "all_private_chats" });
    await client.deleteMyCommands({ type: "all_group_chats" });
    await client.deleteMyCommands({ type: "all_chat_administrators" });

    if (config.botOwnerId !== null) {
      await client.deleteMyCommands({
        type: "chat",
        chat_id: config.botOwnerId,
      });
    }
  } catch (err) {
    console.error("Failed to delete Telegram bot commands:", err);
  }
}
