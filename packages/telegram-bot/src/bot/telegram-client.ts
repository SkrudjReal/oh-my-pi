/**
 * Resilient, high-performance Telegram Bot API HTTP client.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type {
  TelegramFile,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
  TelegramReactionType,
  TelegramUpdate,
  TelegramUser,
} from "../core/types";

export interface SendMessageOptions {
  message_thread_id?: number;
  parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
  disable_web_page_preview?: boolean;
  reply_to_message_id?: number;
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export interface EditMessageOptions {
  parse_mode?: "HTML" | "MarkdownV2" | "Markdown";
  disable_web_page_preview?: boolean;
  reply_markup?: TelegramInlineKeyboardMarkup;
}

export class TelegramClient {
  private readonly baseUrl: string;
  private readonly fileBaseUrl: string;

  constructor(private readonly token: string) {
    if (!token) {
      throw new Error("TelegramClient requires a non-empty bot token.");
    }
    this.baseUrl = `https://api.telegram.org/bot${token}`;
    this.fileBaseUrl = `https://api.telegram.org/file/bot${token}`;
  }

  private async request<T>(
    endpoint: string,
    body?: Record<string, unknown>,
    retries = 3,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
          signal,
        });

        const data = (await response.json()) as {
          ok: boolean;
          result: T;
          description?: string;
          error_code?: number;
          parameters?: { retry_after?: number };
        };

        if (data.ok) {
          return data.result;
        }

        // Handle Telegram 429 Rate Limit
        if (data.error_code === 429 && data.parameters?.retry_after) {
          const waitMs = (data.parameters.retry_after + 1) * 1000;
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }

        // Catch message not modified or message to edit not found gracefully
        if (
          data.description?.includes("message is not modified") ||
          data.description?.includes("message to edit not found")
        ) {
          return null as unknown as T;
        }

        throw new Error(`Telegram API [${endpoint}] error (${data.error_code}): ${data.description}`);
      } catch (err: unknown) {
        if (signal?.aborted) {
          throw err;
        }
        if (attempt === retries - 1) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    throw new Error(`Telegram API [${endpoint}] failed after ${retries} attempts.`);
  }

  async getMe(signal?: AbortSignal): Promise<TelegramUser> {
    return this.request<TelegramUser>("getMe", undefined, 3, signal);
  }

  async getUpdates(options: {
    offset?: number;
    limit?: number;
    timeout?: number;
    allowed_updates?: string[];
  }, signal?: AbortSignal): Promise<TelegramUpdate[]> {
    return this.request<TelegramUpdate[]>("getUpdates", options, 3, signal);
  }

  async sendMessage(
    chat_id: number | string,
    text: string,
    options?: SendMessageOptions,
    signal?: AbortSignal,
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>(
      "sendMessage",
      {
        chat_id,
        text,
        ...options,
      },
      3,
      signal,
    );
  }

  async editMessageText(
    chat_id: number | string,
    message_id: number,
    text: string,
    options?: EditMessageOptions,
    signal?: AbortSignal,
  ): Promise<TelegramMessage | boolean> {
    return this.request<TelegramMessage | boolean>(
      "editMessageText",
      {
        chat_id,
        message_id,
        text,
        ...options,
      },
      3,
      signal,
    );
  }

  async deleteMessage(chat_id: number | string, message_id: number, signal?: AbortSignal): Promise<boolean> {
    try {
      return await this.request<boolean>("deleteMessage", { chat_id, message_id }, 3, signal);
    } catch {
      return false;
    }
  }

  async sendChatAction(
    chat_id: number | string,
    action: "typing" | "upload_photo" | "record_video" | "upload_video" | "record_voice" | "upload_voice" | "upload_document" | "choose_sticker" | "find_location",
    options?: { message_thread_id?: number },
    signal?: AbortSignal,
  ): Promise<boolean> {
    try {
      return await this.request<boolean>("sendChatAction", { chat_id, action, ...options }, 1, signal);
    } catch {
      return false;
    }
  }

  async setMessageReaction(
    chat_id: number | string,
    message_id: number,
    reaction: TelegramReactionType[],
    is_big = false,
    signal?: AbortSignal,
  ): Promise<boolean> {
    try {
      return await this.request<boolean>(
        "setMessageReaction",
        {
          chat_id,
          message_id,
          reaction,
          is_big,
        },
        2,
        signal,
      );
    } catch {
      return false;
    }
  }

  async sendSticker(
    chat_id: number | string,
    sticker: string,
    options?: { message_thread_id?: number; reply_to_message_id?: number },
    signal?: AbortSignal,
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>("sendSticker", { chat_id, sticker, ...options }, 2, signal);
  }

  async sendPhoto(
    chat_id: number | string,
    photo: string,
    caption?: string,
    options?: SendMessageOptions,
    signal?: AbortSignal,
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>(
      "sendPhoto",
      {
        chat_id,
        photo,
        caption,
        ...options,
      },
      3,
      signal,
    );
  }

  async sendDocument(
    chat_id: number | string,
    document: string,
    caption?: string,
    options?: SendMessageOptions,
    signal?: AbortSignal,
  ): Promise<TelegramMessage> {
    return this.request<TelegramMessage>(
      "sendDocument",
      {
        chat_id,
        document,
        caption,
        ...options,
      },
      3,
      signal,
    );
  }

  async getFile(file_id: string, signal?: AbortSignal): Promise<TelegramFile> {
    return this.request<TelegramFile>("getFile", { file_id }, 3, signal);
  }

  async downloadFile(file_id: string, destinationPath: string, signal?: AbortSignal): Promise<string> {
    const file = await this.getFile(file_id, signal);
    if (!file.file_path) {
      throw new Error(`Telegram getFile did not return a file_path for file_id: ${file_id}`);
    }

    const downloadUrl = `${this.fileBaseUrl}/${file.file_path}`;
    const response = await fetch(downloadUrl, { signal });
    if (!response.ok) {
      throw new Error(`Failed to download file from ${downloadUrl}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await fs.mkdir(path.dirname(destinationPath), { recursive: true });
    await fs.writeFile(destinationPath, Buffer.from(arrayBuffer));
    return destinationPath;
  }
}
