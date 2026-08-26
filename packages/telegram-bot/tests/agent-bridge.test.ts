import { describe, expect, test } from "bun:test";
import * as os from "node:os";
import * as path from "node:path";
import { loadConfig } from "../src/core/config";
import { AgentBridge } from "../src/services/agent-bridge";

describe("AgentBridge Session and State Management", () => {
  const tmpRoot = path.join(os.tmpdir(), `omp-test-${Date.now()}`);
  const config = loadConfig({
    telegramToken: "dummy:token",
    workspaceRoot: path.join(tmpRoot, "workspaces"),
    sessionRoot: path.join(tmpRoot, "sessions"),
    defaultModel: "google-antigravity/gemini-3.7-flash",
  });

  const bridge = new AgentBridge(config);

  test("getOrCreateSession initializes isolated directory structure", async () => {
    const session = await bridge.getOrCreateSession(12345, 999, "testuser");
    expect(session.chatId).toBe(12345);
    expect(session.userId).toBe(999);
    expect(session.username).toBe("testuser");
    expect(session.model).toBe("google-antigravity/gemini-3.7-flash");
    expect(session.workspaceDir).toContain("12345");
    expect(session.sessionDir).toContain("12345");
  });

  test("setModel updates chat's specific model", async () => {
    bridge.setModel(12345, "claude-3-7-sonnet");
    const session = bridge.getSession(12345);
    expect(session?.model).toBe("claude-3-7-sonnet");
  });

  test("setApprovalMode updates chat approval mode", async () => {
    bridge.setApprovalMode(12345, "always-ask");
    const session = bridge.getSession(12345);
    expect(session?.approvalMode).toBe("always-ask");
  });

  test("resetSession clears session and resets counters", async () => {
    const session = bridge.getSession(12345);
    if (session) {
      session.totalTokens = 5000;
      session.totalCost = 0.05;
    }
    const result = await bridge.resetSession(12345);
    expect(result).toBe(true);
    const updated = bridge.getSession(12345);
    expect(updated?.totalTokens).toBe(0);
    expect(updated?.totalCost).toBe(0);
  });
});
