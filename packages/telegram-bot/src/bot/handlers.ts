/**
 * Telegram Message & Command Dispatcher.
 */

import type { BotConfig } from "../core/config";
import { isUserAuthorized } from "../core/config";
import type { TelegramMessage } from "../core/types";
import type { AgentBridge } from "../services/agent-bridge";
import { extractMessageContext } from "../services/attachments";
import { TelegramStreamConsumer } from "../services/streamer";
import type { TelegramClient } from "./telegram-client";

export class MessageHandler {
  constructor(
    private readonly client: TelegramClient,
    private readonly agentBridge: AgentBridge,
    private readonly config: BotConfig,
  ) {}

  async handleMessage(message: TelegramMessage): Promise<void> {
    const chatId = message.chat.id;
    const threadId = message.message_thread_id;
    const userId = message.from?.id || 0;
    const username = message.from?.username;

    // 1. Authorization check
    if (!isUserAuthorized(userId, username, this.config)) {
      await this.client.sendMessage(
        chatId,
        "🔒 <b>Access Denied</b>\nThis bot is configured for authorized users only. Please contact the administrator.",
        {
          message_thread_id: threadId,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
      return;
    }

    const text = (message.text || message.caption || "").trim();

    // 2. Command Routing
    if (text.startsWith("/")) {
      const parts = text.split(/\s+/);
      const command = parts[0].toLowerCase().split("@")[0];
      const args = parts.slice(1).join(" ");

      switch (command) {
        case "/start":
          await this.handleStart(message);
          return;

        case "/help":
          await this.handleHelp(message);
          return;

        case "/new":
        case "/clear":
        case "/reset":
          await this.handleReset(message);
          return;

        case "/model":
          await this.handleModel(message, args);
          return;

        case "/mode":
        case "/approval":
          await this.handleApprovalMode(message, args);
          return;

        case "/status":
          await this.handleStatus(message);
          return;

        case "/cancel":
        case "/stop":
          await this.handleCancel(message);
          return;

        default:
          // If unrecognized command, fall through to agent prompt
          break;
      }
    }

    // 3. Regular Prompt / Attachment Execution
    const session = await this.agentBridge.getOrCreateSession(chatId, userId, username);
    const { promptText } = await extractMessageContext(message, session.workspaceDir, this.client);

    if (!promptText) {
      return;
    }

    const streamer = new TelegramStreamConsumer({
      chatId,
      messageThreadId: threadId,
      replyToMessageId: message.message_id,
      client: this.client,
      enableStreaming: this.config.enableStreaming,
      enableReactions: this.config.enableReactions,
      enableStickers: this.config.enableStickers,
      debounceMs: this.config.streamDebounceMs,
    });

    try {
      await this.agentBridge.executePrompt(chatId, userId, username, promptText, streamer);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.client.sendMessage(
        chatId,
        `⚠️ <b>Agent error:</b> ${msg}`,
        {
          message_thread_id: threadId,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
    }
  }

  private async handleStart(message: TelegramMessage): Promise<void> {
    const session = await this.agentBridge.getOrCreateSession(
      message.chat.id,
      message.from?.id || 0,
      message.from?.username,
    );

    const welcome = [
      "🤖 <b>Oh My Pi (omp) AI Agent Bridge</b>",
      "",
      "Universal AI Coding & Automation Assistant with real-time streaming, terminal execution, file editing, and web capabilities.",
      "",
      `🎯 <b>Active Model:</b> <code>${session.model}</code>`,
      `🛡 <b>Approval Mode:</b> <code>${session.approvalMode}</code>`,
      `📁 <b>Workspace:</b> <code>${session.workspaceDir}</code>`,
      "",
      "<b>Available Commands:</b>",
      "• /new — Clear session & start fresh context",
      "• /model &lt;name&gt; — Switch model",
      "• /mode &lt;yolo|write|always-ask&gt; — Change tool approval mode",
      "• /status — View session statistics",
      "• /cancel — Stop active agent task",
      "• /help — Full command & markup guide",
      "",
      "<i>Send any message or attachment (photo, document, voice) to get started!</i>",
    ].join("\n");

    await this.client.sendMessage(message.chat.id, welcome, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleHelp(message: TelegramMessage): Promise<void> {
    const help = [
      "📖 <b>Oh My Pi (omp) Bot Commands & Markup</b>",
      "",
      "<b>Commands:</b>",
      "• <code>/new</code>, <code>/clear</code>, <code>/reset</code> — Reset conversation context",
      "• <code>/model [model_name]</code> — View or switch model (e.g. <code>gemini-3.7-flash</code>, <code>claude-3-7-sonnet</code>, <code>gpt-4o</code>)",
      "• <code>/mode [yolo|write|always-ask]</code> — Set tool execution approval mode",
      "• <code>/status</code> — Display session stats, token consumption, and uptime",
      "• <code>/cancel</code> — Immediately abort the currently running agent task",
      "",
      "<b>Special Markup Supported:</b>",
      "• Telegram Premium Custom Emoji: <code>&lt;tg-emoji emoji-id=\"...\"&gt;✨&lt;/tg-emoji&gt;</code>",
      "• Telegram Message Reactions: <code>&lt;tg-react emoji=\"🔥\"/&gt;</code>",
      "• Telegram Stickers: <code>&lt;tg-sticker tag=\"heart\"/&gt;</code>",
      "",
      "<b>Media & Attachments:</b>",
      "You can send images, code files, archives, documents, and voice notes. They will be downloaded to your session workspace and analyzed directly.",
    ].join("\n");

    await this.client.sendMessage(message.chat.id, help, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleReset(message: TelegramMessage): Promise<void> {
    await this.agentBridge.resetSession(message.chat.id);
    await this.client.sendMessage(
      message.chat.id,
      "🧹 <b>Session Reset</b>\nConversation history has been cleared. Starting a fresh context.",
      {
        message_thread_id: message.message_thread_id,
        reply_to_message_id: message.message_id,
        parse_mode: "HTML",
      },
    );
  }

  private async handleModel(message: TelegramMessage, args: string): Promise<void> {
    const session = await this.agentBridge.getOrCreateSession(
      message.chat.id,
      message.from?.id || 0,
      message.from?.username,
    );

    const modelName = args.trim();
    if (!modelName) {
      const text = [
        `🎯 <b>Current Model:</b> <code>${session.model}</code>`,
        "",
        "<b>To switch model, run:</b>",
        "<code>/model google-antigravity/gemini-3.7-flash</code>",
        "<code>/model claude-3-7-sonnet</code>",
        "<code>/model gpt-4o</code>",
        "<code>/model deepseek/deepseek-chat</code>",
      ].join("\n");

      await this.client.sendMessage(message.chat.id, text, {
        message_thread_id: message.message_thread_id,
        reply_to_message_id: message.message_id,
        parse_mode: "HTML",
      });
      return;
    }

    this.agentBridge.setModel(message.chat.id, modelName);
    await this.client.sendMessage(
      message.chat.id,
      `✅ <b>Model updated to:</b> <code>${modelName}</code>`,
      {
        message_thread_id: message.message_thread_id,
        reply_to_message_id: message.message_id,
        parse_mode: "HTML",
      },
    );
  }

  private async handleApprovalMode(message: TelegramMessage, args: string): Promise<void> {
    const session = await this.agentBridge.getOrCreateSession(
      message.chat.id,
      message.from?.id || 0,
      message.from?.username,
    );

    const mode = args.trim().toLowerCase();
    if (mode === "yolo" || mode === "write" || mode === "always-ask") {
      this.agentBridge.setApprovalMode(message.chat.id, mode);
      await this.client.sendMessage(
        message.chat.id,
        `🛡 <b>Approval Mode updated to:</b> <code>${mode}</code>`,
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
      return;
    }

    const text = [
      `🛡 <b>Current Approval Mode:</b> <code>${session.approvalMode}</code>`,
      "",
      "<b>Usage:</b> <code>/mode &lt;yolo|write|always-ask&gt;</code>",
      "• <code>yolo</code> — Auto-approve all tools",
      "• <code>write</code> — Auto-approve read/search, ask on file edits",
      "• <code>always-ask</code> — Ask confirmation for all operations",
    ].join("\n");

    await this.client.sendMessage(message.chat.id, text, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleStatus(message: TelegramMessage): Promise<void> {
    const session = await this.agentBridge.getOrCreateSession(
      message.chat.id,
      message.from?.id || 0,
      message.from?.username,
    );

    const uptimeSec = Math.floor((Date.now() - session.createdAt) / 1000);
    const mins = Math.floor(uptimeSec / 60);
    const secs = uptimeSec % 60;

    const status = [
      "📊 <b>OMP Agent Session Status</b>",
      "",
      `🎯 <b>Model:</b> <code>${session.model}</code>`,
      `🛡 <b>Approval Mode:</b> <code>${session.approvalMode}</code>`,
      `⚡ <b>Is Running:</b> <code>${session.isRunning ? "YES" : "NO"}</code>`,
      `🔢 <b>Total Tokens:</b> <code>${session.totalTokens.toLocaleString()}</code>`,
      `💰 <b>Total Est. Cost:</b> <code>$${session.totalCost.toFixed(4)}</code>`,
      `⏱ <b>Session Age:</b> <code>${mins}m ${secs}s</code>`,
      `📁 <b>Workspace:</b> <code>${session.workspaceDir}</code>`,
    ].join("\n");

    await this.client.sendMessage(message.chat.id, status, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleCancel(message: TelegramMessage): Promise<void> {
    const cancelled = this.agentBridge.cancelTask(message.chat.id);
    if (cancelled) {
      await this.client.sendMessage(
        message.chat.id,
        "🛑 <b>Task Cancelled</b>\nThe active agent execution has been stopped.",
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
    } else {
      await this.client.sendMessage(
        message.chat.id,
        "ℹ️ No active task is currently running in this chat.",
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
    }
  }
}
