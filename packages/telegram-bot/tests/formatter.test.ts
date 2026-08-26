import { describe, expect, test } from "bun:test";
import {
  escapeHtml,
  extractReactions,
  extractStickers,
  mdToTelegramHtml,
  splitTelegramText,
  stripDeliveryTags,
  stripThinkTags,
  wrapMarkdownTables,
} from "../src/services/formatter";

describe("Telegram Formatter & Markdown Converter", () => {
  test("escapeHtml escapes basic HTML special chars", () => {
    expect(escapeHtml("1 < 2 & 3 > 0")).toBe("1 &lt; 2 &amp; 3 &gt; 0");
  });

  test("stripThinkTags removes think/thought tags", () => {
    const raw = "<think>Secret internal reasoning here</think>Hello world!";
    expect(stripThinkTags(raw)).toBe("Hello world!");

    const incomplete = "Hello world! <thought>Still pondering...";
    expect(stripThinkTags(incomplete)).toBe("Hello world!");
  });

  test("extractReactions parses <tg-react> tags", () => {
    const text = 'Awesome job! <tg-react emoji="🔥"/> and <tg-react emoji="❤"/>';
    expect(extractReactions(text)).toEqual(["🔥", "❤"]);
  });

  test("extractStickers parses <tg-sticker> tags", () => {
    const text = 'Here is a gift <tg-sticker tag="heart"/> for you!';
    expect(extractStickers(text)).toEqual(["heart"]);
  });

  test("stripDeliveryTags removes control tags", () => {
    const text = 'Hello <tg-react emoji="🔥"/> and <tg-sticker tag="heart"/>';
    expect(stripDeliveryTags(text)).toBe("Hello and");
  });

  test("wrapMarkdownTables converts pipe tables to card lists", () => {
    const mdTable = `| Tool | Description | Status |
| --- | --- | --- |
| bash | Execute commands | Active |
| read | Read files | Ready |`;

    const converted = wrapMarkdownTables(mdTable);
    expect(converted).toContain("📊 <b>Tool:</b> bash");
    expect(converted).toContain("• <b>Description:</b> Execute commands");
    expect(converted).toContain("• <b>Status:</b> Active");
  });

  test("mdToTelegramHtml formats bold, italic, code, spoilers, and custom emojis", () => {
    const markdown = [
      "# Main Title",
      "This is **bold** and _italic_ and `inline code`.",
      "Check this ||spoiler|| and [Docs](https://omp.sh).",
      '<tg-emoji emoji-id="5336824751673343377">👌</tg-emoji>',
      "```ts",
      "const a = 1 < 2;",
      "```",
    ].join("\n");

    const html = mdToTelegramHtml(markdown);
    expect(html).toContain("<b>Main Title</b>");
    expect(html).toContain("<b>bold</b>");
    expect(html).toContain("<i>italic</i>");
    expect(html).toContain("<code>inline code</code>");
    expect(html).toContain("<tg-spoiler>spoiler</tg-spoiler>");
    expect(html).toContain('<a href="https://omp.sh">Docs</a>');
    expect(html).toContain('<tg-emoji emoji-id="5336824751673343377">👌</tg-emoji>');
    expect(html).toContain('<pre><code class="language-ts">const a = 1 &lt; 2;</code></pre>');
  });

  test("splitTelegramText cleanly splits long text without breaking lines", () => {
    const longText = "Paragraph 1\n\n".repeat(500);
    const chunks = splitTelegramText(longText, 1000);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1000);
    }
  });
});
