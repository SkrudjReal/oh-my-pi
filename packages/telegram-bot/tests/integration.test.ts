import { describe, expect, test } from "bun:test";
import { TelegramClient } from "../src/bot/telegram-client";
import { isUserAdmin, isUserAuthorized, loadConfig } from "../src/core/config";

const TEST_TOKEN = "8678282604:AAESKKpEHyegECFdEyjqPMKZx5SVDlU3LAc";

describe("Telegram Client & Config Live Integration", () => {
  test("getMe returns correct bot identity", async () => {
    const client = new TelegramClient(TEST_TOKEN);
    const me = await client.getMe();
    expect(me.is_bot).toBe(true);
    expect(me.id).toBe(8678282604);
    expect(me.username).toBe("my_ai_waifuu_bot");
  });

  test("loadConfig correctly parses overrides and defaults", () => {
    const config = loadConfig({
      telegramToken: TEST_TOKEN,
      defaultModel: "google-antigravity/gemini-3.7-flash",
      isPublicMode: true,
    });

    expect(config.telegramToken).toBe(TEST_TOKEN);
    expect(config.defaultModel).toBe("google-antigravity/gemini-3.7-flash");
    expect(config.isPublicMode).toBe(true);
    expect(isUserAuthorized(123456, "testuser", config)).toBe(true);
  });

  test("Authorization checks respect whitelist and admin lists", () => {
    const config = loadConfig({
      telegramToken: TEST_TOKEN,
      isPublicMode: false,
    });
    config.allowedUsers.add("112233");
    config.allowedUsers.add("alice");
    config.adminUsers.add("999999");
    config.adminUsers.add("bob");

    expect(isUserAuthorized(112233, undefined, config)).toBe(true);
    expect(isUserAuthorized(445566, "alice", config)).toBe(true);
    expect(isUserAuthorized(999999, undefined, config)).toBe(true);
    expect(isUserAuthorized(123, "bob", config)).toBe(true);
    expect(isUserAuthorized(123456, "stranger", config)).toBe(false);

    expect(isUserAdmin(999999, undefined, config)).toBe(true);
    expect(isUserAdmin(123, "bob", config)).toBe(true);
    expect(isUserAdmin(112233, "alice", config)).toBe(false);
  });
});
