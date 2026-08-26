/**
 * Telegram Message, Command & Callback Query Dispatcher with Interactive Keyboards.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BotConfig } from "../core/config";
import type {
  TelegramCallbackQuery,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
} from "../core/types";
import type { AgentBridge } from "../services/agent-bridge";
import { extractMessageContext } from "../services/attachments";
import { TelegramStreamConsumer } from "../services/streamer";
import { authenticateUpdate, F } from "./middlewares";
import type { TelegramClient } from "./telegram-client";

export class MessageHandler {
  constructor(
    private readonly client: TelegramClient,
    private readonly agentBridge: AgentBridge,
    private readonly config: BotConfig,
  ) {}

  async handleMessage(message: TelegramMessage): Promise<void> {
    // 1. Strict Middleware Authentication
    const isAllowed = await authenticateUpdate(message, this.config, this.client);
    if (!isAllowed) {
      return;
    }

    const chatId = message.chat.id;
    const threadId = message.message_thread_id;
    const userId = message.from?.id || 0;
    const username = message.from?.username;
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

        case "/thinking":
          await this.handleThinking(message, args);
          return;

        case "/status":
          await this.handleStatus(message);
          return;

        case "/tools":
          await this.handleTools(message);
          return;

        case "/skills":
          await this.handleSkills(message);
          return;

        case "/workspace":
          await this.handleWorkspace(message);
          return;

        case "/compact":
          await this.handleCompact(message);
          return;

        case "/cancel":
        case "/stop":
          await this.handleCancel(message);
          return;

        default:
          // Unrecognized command -> forward to agent prompt
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

  async handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
    const data = query.data || "";
    const user = query.from;
    const message = query.message;

    if (!F.isAuthorized(user, this.config)) {
      await this.client.answerCallbackQuery(query.id, {
        text: "🔒 Доступ запрещен (только для владельца)",
        show_alert: true,
      });
      return;
    }

    if (!message) {
      await this.client.answerCallbackQuery(query.id);
      return;
    }

    const chatId = message.chat.id;

    if (data === "cmd_new") {
      await this.agentBridge.resetSession(chatId);
      await this.client.answerCallbackQuery(query.id, { text: "🧹 Контекст сессии очищен!" });
      await this.client.sendMessage(
        chatId,
        "🧹 <b>Контекст диалога очищен.</b> Начат новый сеанс.",
        { parse_mode: "HTML" },
      );
      return;
    }

    if (data === "menu_models") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleModel(message, "");
      return;
    }

    if (data.startsWith("set_model:")) {
      const modelName = data.slice("set_model:".length);
      this.agentBridge.setModel(chatId, modelName);
      await this.client.answerCallbackQuery(query.id, { text: `✅ Модель: ${modelName}` });
      await this.client.sendMessage(
        chatId,
        `🎯 <b>Модель переключена:</b> <code>${modelName}</code>`,
        { parse_mode: "HTML" },
      );
      return;
    }

    if (data === "menu_modes") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleApprovalMode(message, "");
      return;
    }

    if (data.startsWith("set_mode:")) {
      const mode = data.slice("set_mode:".length) as "yolo" | "write" | "always-ask";
      this.agentBridge.setApprovalMode(chatId, mode);
      await this.client.answerCallbackQuery(query.id, { text: `🛡 Режим: ${mode}` });
      await this.client.sendMessage(
        chatId,
        `🛡 <b>Режим аппрува обновлен:</b> <code>${mode}</code>`,
        { parse_mode: "HTML" },
      );
      return;
    }

    if (data === "menu_thinking") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleThinking(message, "");
      return;
    }

    if (data.startsWith("set_thinking:")) {
      const level = data.slice("set_thinking:".length);
      this.config.defaultThinkingLevel = level;
      await this.client.answerCallbackQuery(query.id, { text: `🧠 Thinking: ${level}` });
      await this.client.sendMessage(
        chatId,
        `🧠 <b>Уровень размышлений (thinking) установлен:</b> <code>${level}</code>`,
        { parse_mode: "HTML" },
      );
      return;
    }

    if (data === "cmd_status") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleStatus(message);
      return;
    }

    if (data === "cmd_tools") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleTools(message);
      return;
    }

    if (data === "cmd_skills") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleSkills(message);
      return;
    }

    if (data === "cmd_workspace") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleWorkspace(message);
      return;
    }

    if (data === "cmd_help") {
      await this.client.answerCallbackQuery(query.id);
      await this.handleHelp(message);
      return;
    }

    if (data === "cmd_cancel") {
      await this.handleCancel(message);
      await this.client.answerCallbackQuery(query.id, { text: "🛑 Отменено" });
      return;
    }

    await this.client.answerCallbackQuery(query.id);
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
      "Универсальный автономный ассистент разработки с прямым доступом к IDE, инструментам выполнения команд, чтения и правки файлов, веб-поиску и стримингу в реальном времени.",
      "",
      `🎯 <b>Активная модель:</b> <code>${session.model}</code>`,
      `🛡 <b>Режим аппрува:</b> <code>${session.approvalMode}</code>`,
      `🧠 <b>Thinking level:</b> <code>${this.config.defaultThinkingLevel}</code>`,
      `📁 <b>Воркспейс:</b> <code>${session.workspaceDir}</code>`,
      "",
      "<i>Отправьте задачу текстом, прикрепите код/фото/документ или воспользуйтесь кнопками быстрого управления:</i>",
    ].join("\n");

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🧹 Сбросить контекст", callback_data: "cmd_new" },
          { text: "🎯 Сменить модель", callback_data: "menu_models" },
        ],
        [
          { text: "🛡 Режим работы", callback_data: "menu_modes" },
          { text: "🧠 Размышления", callback_data: "menu_thinking" },
        ],
        [
          { text: "🛠 Инструменты", callback_data: "cmd_tools" },
          { text: "🧩 Скиллы", callback_data: "cmd_skills" },
        ],
        [
          { text: "📊 Статус сессии", callback_data: "cmd_status" },
          { text: "📁 Воркспейс", callback_data: "cmd_workspace" },
        ],
        [
          { text: "📖 Справка и документация", callback_data: "cmd_help" },
        ],
      ],
    };

    await this.client.sendMessage(message.chat.id, welcome, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  private async handleHelp(message: TelegramMessage): Promise<void> {
    const help = [
      "📖 <b>Команды Oh My Pi (omp) Telegram Bot</b>",
      "",
      "<b>Управление сессией:</b>",
      "• <code>/new</code>, <code>/clear</code> — Очистить контекст диалога и начать с чистого листа",
      "• <code>/status</code> — Статус активного процесса, статистика токенов и аптайм",
      "• <code>/cancel</code> — Немедленно прервать текущую запущенную задачу",
      "• <code>/workspace</code> — Показать файлы и путь к рабочей директории чата",
      "• <code>/compact</code> — Сжать контекст сессии (Snapcompact)",
      "",
      "<b>Конфигурация агента:</b>",
      "• <code>/model [имя]</code> — Сменить LLM модель (Gemini, Claude, GPT, DeepSeek)",
      "• <code>/mode [yolo|write|always-ask]</code> — Настроить политику подтверждения инструментов",
      "• <code>/thinking [off|low|medium|high]</code> — Настроить глубину размышлений",
      "• <code>/tools</code> — Показать доступные инструменты агента",
      "• <code>/skills</code> — Показать установленные навыки и расширения",
      "",
      "<b>Интерактивная разметка & Премиум эмодзи:</b>",
      "• Telegram Premium Custom Emoji: <code>&lt;tg-emoji emoji-id=\"...\"&gt;✨&lt;/tg-emoji&gt;</code>",
      "• Telegram Reactions: <code>&lt;tg-react emoji=\"🔥\"/&gt;</code>",
      "• Telegram Stickers: <code>&lt;tg-sticker tag=\"heart\"/&gt;</code>",
      "",
      "<b>Мультимодальность:</b>",
      "Отправляйте изображения, архивы, код, документы и голосовые заметки — бот сохраняет их в рабочий каталог чата и подключает к анализу агента.",
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
      "🧹 <b>Контекст сессии очищен!</b>\nИстория диалога сброшена, готов к новым задачам.",
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
    if (modelName) {
      this.agentBridge.setModel(message.chat.id, modelName);
      await this.client.sendMessage(
        message.chat.id,
        `✅ <b>Модель установлена:</b> <code>${modelName}</code>`,
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
      return;
    }

    const text = [
      `🎯 <b>Текущая модель:</b> <code>${session.model}</code>`,
      "",
      "Выберите модель из списка быстрых пресетов или введите команду вида <code>/model &lt;имя_модели&gt;</code>:",
    ].join("\n");

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "⚡ Gemini 3.7 Flash", callback_data: "set_model:google-antigravity/gemini-3.7-flash" },
          { text: "🧠 Claude 3.7 Sonnet", callback_data: "set_model:claude-3-7-sonnet" },
        ],
        [
          { text: "🚀 GPT-4o", callback_data: "set_model:gpt-4o" },
          { text: "🌌 DeepSeek V3", callback_data: "set_model:deepseek/deepseek-chat" },
        ],
        [
          { text: "🏎 Claude 3.5 Haiku", callback_data: "set_model:claude-3-5-haiku" },
          { text: "🔮 O3-Mini", callback_data: "set_model:o3-mini" },
        ],
      ],
    };

    await this.client.sendMessage(message.chat.id, text, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
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
        `🛡 <b>Режим подтверждения инструментов обновлен:</b> <code>${mode}</code>`,
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
      return;
    }

    const text = [
      `🛡 <b>Текущий режим работы:</b> <code>${session.approvalMode}</code>`,
      "",
      "<b>Выберите режим подтверждения действий:</b>",
      "• <b>YOLO</b> — Полный авто-аппрув всех действий и терминала",
      "• <b>Write</b> — Авто-аппрув чтения/поиска, запрос на запись",
      "• <b>Always-Ask</b> — Запрос подтверждения на каждую операцию",
    ].join("\n");

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "⚡ YOLO (Авто-аппрув)", callback_data: "set_mode:yolo" },
        ],
        [
          { text: "✏️ Write (Запрос на запись)", callback_data: "set_mode:write" },
        ],
        [
          { text: "🛡 Always Ask (Строгий)", callback_data: "set_mode:always-ask" },
        ],
      ],
    };

    await this.client.sendMessage(message.chat.id, text, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  private async handleThinking(message: TelegramMessage, args: string): Promise<void> {
    const level = args.trim().toLowerCase();
    if (["off", "low", "medium", "high", "max"].includes(level)) {
      this.config.defaultThinkingLevel = level;
      await this.client.sendMessage(
        message.chat.id,
        `🧠 <b>Уровень размышлений (thinking) установлен:</b> <code>${level}</code>`,
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
      return;
    }

    const text = [
      `🧠 <b>Текущий уровень размышлений:</b> <code>${this.config.defaultThinkingLevel}</code>`,
      "",
      "Выберите глубину цепочки рассуждений (thinking/reasoning):",
    ].join("\n");

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🚫 Off", callback_data: "set_thinking:off" },
          { text: "🟢 Low", callback_data: "set_thinking:low" },
          { text: "🟡 Medium", callback_data: "set_thinking:medium" },
          { text: "🔴 High", callback_data: "set_thinking:high" },
        ],
      ],
    };

    await this.client.sendMessage(message.chat.id, text, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      reply_markup: keyboard,
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
      "📊 <b>Статус сессии OMP Agent</b>",
      "",
      `🎯 <b>Модель:</b> <code>${session.model}</code>`,
      `🛡 <b>Режим:</b> <code>${session.approvalMode}</code>`,
      `🧠 <b>Thinking:</b> <code>${this.config.defaultThinkingLevel}</code>`,
      `⚡ <b>Активен:</b> <code>${session.isRunning ? "🟢 В процессе выполнения" : "⚪ Ожидание команды"}</code>`,
      `🔢 <b>Расход токенов:</b> <code>${session.totalTokens.toLocaleString()}</code>`,
      `💰 <b>Ориентир. затраты:</b> <code>$${session.totalCost.toFixed(4)}</code>`,
      `⏱ <b>Длительность сессии:</b> <code>${mins}м ${secs}с</code>`,
      `📁 <b>Воркспейс:</b> <code>${session.workspaceDir}</code>`,
    ].join("\n");

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: "🔄 Обновить", callback_data: "cmd_status" },
          { text: "🛑 Прервать задачу", callback_data: "cmd_cancel" },
        ],
      ],
    };

    await this.client.sendMessage(message.chat.id, status, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }

  private async handleTools(message: TelegramMessage): Promise<void> {
    const tools = [
      "🛠 <b>Доступные инструменты OMP Agent:</b>",
      "",
      "• <code>bash</code> — Выполнение команд терминала в изолированном окружении",
      "• <code>read</code> — Чтение файлов, архивов, sqlite баз и веб-страниц",
      "• <code>edit</code> — Точечное редактирование файлов по строкам и блокам",
      "• <code>write</code> — Создание и перезапись файлов",
      "• <code>grep</code> — Быстрый поиск по содержимому (встроенный Rust regex)",
      "• <code>glob</code> — Поиск путей и структуры файлов по шаблонам",
      "• <code>lsp</code> — Анализ кода и навигация по символам через языковые серверы",
      "• <code>web_search</code> — Актуальный поиск в интернете",
      "• <code>task</code> — Запуск параллельных саб-агентов для масштабных задач",
      "• <code>todo</code> — Управление пошаговым чеклистом задач",
      "• <code>browser</code> — Автоматизация браузера (Chromium / Puppeteer)",
    ].join("\n");

    await this.client.sendMessage(message.chat.id, tools, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleSkills(message: TelegramMessage): Promise<void> {
    const skills = [
      "🧩 <b>Активные скиллы OMP:</b>",
      "",
      "• <b>omp-telegram-bot</b> — Развёртывание и поддержка Telegram-ботов для OMP",
      "• <b>telegram-premium-emoji</b> — Поддержка Telegram Premium custom emoji, реакций и стикеров",
      "• <b>clean-code & refactoring</b> — Стандарты чистоты кода и архитектуры",
      "• <b>systematic-debugging</b> — Пошаговая диагностика и устранение багов",
    ].join("\n");

    await this.client.sendMessage(message.chat.id, skills, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleWorkspace(message: TelegramMessage): Promise<void> {
    const session = await this.agentBridge.getOrCreateSession(
      message.chat.id,
      message.from?.id || 0,
      message.from?.username,
    );

    let filesList = "(пусто)";
    try {
      const entries = await fs.readdir(session.workspaceDir);
      if (entries.length > 0) {
        filesList = entries.slice(0, 20).map((f) => `  • <code>${f}</code>`).join("\n");
      }
    } catch {
      // Ignored
    }

    const text = [
      "📁 <b>Рабочая директория (Workspace):</b>",
      `<code>${session.workspaceDir}</code>`,
      "",
      "<b>Файлы в воркспейсе:</b>",
      filesList,
    ].join("\n");

    await this.client.sendMessage(message.chat.id, text, {
      message_thread_id: message.message_thread_id,
      reply_to_message_id: message.message_id,
      parse_mode: "HTML",
    });
  }

  private async handleCompact(message: TelegramMessage): Promise<void> {
    await this.client.sendMessage(
      message.chat.id,
      "🗜 <b>Сжатие контекста:</b> Snapcompact оптимизирует историю диалога без потери ключевых фактов.",
      {
        message_thread_id: message.message_thread_id,
        reply_to_message_id: message.message_id,
        parse_mode: "HTML",
      },
    );
  }

  private async handleCancel(message: TelegramMessage): Promise<void> {
    const cancelled = this.agentBridge.cancelTask(message.chat.id);
    if (cancelled) {
      await this.client.sendMessage(
        message.chat.id,
        "🛑 <b>Задача прервана</b>\nАктивный процесс агента был успешно остановлен.",
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
    } else {
      await this.client.sendMessage(
        message.chat.id,
        "ℹ️ В данный момент нет активных задач для отмены.",
        {
          message_thread_id: message.message_thread_id,
          reply_to_message_id: message.message_id,
          parse_mode: "HTML",
        },
      );
    }
  }
}
