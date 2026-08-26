/**
 * Agent Bridge: Spawns and manages OMP subprocess instances with JSON streaming,
 * per-chat session directories, workspace management, and concurrency locking.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { BotConfig } from "../core/config";
import type { ChatSessionState, OmpStreamEvent } from "../core/types";
import type { TelegramStreamConsumer } from "./streamer";

export class AgentBridge {
  private readonly sessions = new Map<number, ChatSessionState>();
  private readonly config: BotConfig;

  constructor(config: BotConfig) {
    this.config = config;
  }

  async getOrCreateSession(chatId: number, userId: number, username?: string): Promise<ChatSessionState> {
    let session = this.sessions.get(chatId);
    if (!session) {
      const sessionDir = path.join(this.config.sessionRoot, String(chatId));
      const workspaceDir = path.join(this.config.workspaceRoot, String(chatId));

      await fs.mkdir(sessionDir, { recursive: true });
      await fs.mkdir(workspaceDir, { recursive: true });

      session = {
        chatId,
        userId,
        username,
        model: this.config.defaultModel,
        approvalMode: this.config.defaultApprovalMode,
        sessionDir,
        workspaceDir,
        createdAt: Date.now(),
        lastActiveAt: Date.now(),
        totalTokens: 0,
        totalCost: 0,
        isRunning: false,
      };
      this.sessions.set(chatId, session);
    }
    session.lastActiveAt = Date.now();
    return session;
  }

  getSession(chatId: number): ChatSessionState | undefined {
    return this.sessions.get(chatId);
  }

  async resetSession(chatId: number): Promise<boolean> {
    const session = this.sessions.get(chatId);
    if (session) {
      if (session.isRunning && session.currentProcessAbortController) {
        session.currentProcessAbortController.abort();
      }
      try {
        await fs.rm(session.sessionDir, { recursive: true, force: true });
        await fs.mkdir(session.sessionDir, { recursive: true });
      } catch {
        // Ignored
      }
      session.totalTokens = 0;
      session.totalCost = 0;
      session.isRunning = false;
      session.currentProcessAbortController = undefined;
      return true;
    }
    return false;
  }

  cancelTask(chatId: number): boolean {
    const session = this.sessions.get(chatId);
    if (session?.isRunning && session.currentProcessAbortController) {
      session.currentProcessAbortController.abort();
      session.isRunning = false;
      return true;
    }
    return false;
  }

  setModel(chatId: number, model: string): void {
    const session = this.sessions.get(chatId);
    if (session) {
      session.model = model;
    }
  }

  setApprovalMode(chatId: number, mode: "yolo" | "write" | "always-ask"): void {
    const session = this.sessions.get(chatId);
    if (session) {
      session.approvalMode = mode;
    }
  }

  async executePrompt(
    chatId: number,
    userId: number,
    username: string | undefined,
    prompt: string,
    streamer: TelegramStreamConsumer,
  ): Promise<void> {
    const session = await this.getOrCreateSession(chatId, userId, username);

    if (session.isRunning) {
      throw new Error("Another agent task is already running in this chat. Send /cancel to stop it.");
    }

    session.isRunning = true;
    const abortController = new AbortController();
    session.currentProcessAbortController = abortController;

    const args = [
      "--mode",
      "json",
      "-p",
      "--session-dir",
      session.sessionDir,
      "--cwd",
      session.workspaceDir,
      "--approval-mode",
      session.approvalMode,
      "--thinking",
      this.config.defaultThinkingLevel,
    ];

    if (session.model) {
      args.push("--model", session.model);
    }
    if (this.config.smolModel) {
      args.push("--smol", this.config.smolModel);
    }
    if (this.config.slowModel) {
      args.push("--slow", this.config.slowModel);
    }
    if (this.config.systemPrompt) {
      args.push("--append-system-prompt", this.config.systemPrompt);
    }

    args.push("--continue");
    args.push(prompt);

    await streamer.start();

    try {
      const proc = Bun.spawn([this.config.ompExecutable, ...args], {
        cwd: session.workspaceDir,
        env: {
          ...process.env,
          OMP_AUTO_APPROVE: session.approvalMode,
        },
        stdout: "pipe",
        stderr: "pipe",
        signal: abortController.signal,
      });

      const stdoutReader = proc.stdout.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("{")) continue;

          try {
            const event = JSON.parse(trimmed) as OmpStreamEvent;
            this.handleStreamEvent(event, streamer, session);
          } catch {
            // Ignore non-JSON or partial lines
          }
        }
      }

      if (buffer.trim().startsWith("{")) {
        try {
          const event = JSON.parse(buffer.trim()) as OmpStreamEvent;
          this.handleStreamEvent(event, streamer, session);
        } catch {
          // Ignore
        }
      }

      await proc.exited;
    } catch (err: unknown) {
      if (abortController.signal.aborted) {
        streamer.onTextDelta("\n\n<i>⛔ Task cancelled by user.</i>");
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        streamer.onTextDelta(`\n\n⚠️ <b>Execution error:</b> ${msg}`);
      }
    } finally {
      session.isRunning = false;
      session.currentProcessAbortController = undefined;
      await streamer.finalize();
    }
  }

  private handleStreamEvent(
    event: OmpStreamEvent,
    streamer: TelegramStreamConsumer,
    session: ChatSessionState,
  ): void {
    switch (event.type) {
      case "turn_start":
        streamer.onTurnStart();
        break;

      case "tool_execution_start":
        streamer.onToolStart(
          String(event.toolName),
          (event.args as Record<string, unknown>) || {},
          event.intent ? String(event.intent) : undefined,
        );
        break;

      case "tool_execution_end":
        streamer.onToolEnd(
          String(event.toolName),
          event.result,
          Boolean(event.isError),
        );
        break;

      case "message_update": {
        const update = event.assistantMessageEvent as
          | { type: string; delta?: string; content?: string }
          | undefined;
        if (update && update.type === "text_delta" && update.delta) {
          streamer.onTextDelta(update.delta);
        }
        break;
      }

      case "turn_end": {
        const msg = event.message as
          | { usage?: { totalTokens?: number; cost?: { total?: number } } }
          | undefined;
        if (msg?.usage?.totalTokens) {
          session.totalTokens += msg.usage.totalTokens;
        }
        if (msg?.usage?.cost?.total) {
          session.totalCost += msg.usage.cost.total;
        }
        break;
      }

      default:
        break;
    }
  }
}
