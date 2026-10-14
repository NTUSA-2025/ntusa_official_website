import { describe, expect, it } from "vitest";
import { sanitizePostHtml } from "./post-html";

describe("sanitizePostHtml", () => {
  it("preserves the editor's formatting and safe images", () => {
    const html = '<h2>Title</h2><p><strong>Bold</strong> <em>italic</em><br><s>old</s></p><ol start="3"><li>Item</li></ol><blockquote><p>Quote</p></blockquote><pre><code>const x = 1;</code></pre><hr><img src="https://example.com/photo.png" alt="Photo">';
    expect(sanitizePostHtml(html)).toBe(html.replaceAll("<br>", "<br />").replaceAll("<hr>", "<hr />").replaceAll('alt="Photo">', 'alt="Photo" />'));
  });

  it("drops scripts, event handlers, styles, and unsupported elements", () => {
    const html = '<div><p class="unsafe" style="background:url(javascript:alert(1))" onclick="alert(1)">Safe</p><script>alert(1)</script><svg onload="alert(1)"><text>bad</text></svg><img src="/r2/photo.png" onerror="alert(1)" alt="Photo"></div>';
    expect(sanitizePostHtml(html)).toBe('<p>Safe</p><img src="/r2/photo.png" alt="Photo" />');
  });

  it("rejects unsafe and disguised image URL schemes", () => {
    const html = '<img src="jav&#x61;script:alert(1)"><img src="data:image/svg+xml;base64,PHN2Zz4="><img src="//evil.example/photo.png"><img src="https://example.com/photo.png">';
    const clean = sanitizePostHtml(html);
    expect(clean).toBe('<img /><img /><img /><img src="https://example.com/photo.png" />');
    expect(sanitizePostHtml(clean)).toBe(clean);
  });
});
