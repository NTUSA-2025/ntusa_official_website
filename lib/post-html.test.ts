import { describe, expect, it } from "vitest";
import { getPostLinkDestinations, hasCredentialedPostLink, sanitizePostHtml } from "./post-html";

describe("sanitizePostHtml", () => {
  it("preserves the editor's formatting and safe images", () => {
    const html = '<h2>Title</h2><p><strong>Bold</strong> <em>italic</em><br><s>old</s></p><ol start="3"><li>Item</li></ol><blockquote><p>Quote</p></blockquote><pre><code>const x = 1;</code></pre><hr><img src="https://example.com/photo.png" alt="Photo">';
    expect(sanitizePostHtml(html)).toBe(html.replaceAll("<br>", "<br />").replaceAll("<hr>", "<hr />").replaceAll('alt="Photo">', 'alt="Photo" />'));
  });

  it("preserves safe article links without editor-only attributes", () => {
    const html = '<p>See <a href="https://example.com/events?q=1" target="_blank" rel="noopener noreferrer nofollow">events</a></p>';
    expect(sanitizePostHtml(html)).toBe('<p>See <a href="https://example.com/events?q=1">events</a></p>');
  });

  it("removes unsafe link destinations and event handlers", () => {
    const html = '<p><a href="javascript:alert(1)">bad</a><a href="//evil.example">relative</a><a href="http://">malformed</a><a href="https://example.com" onclick="alert(1)">safe</a></p>';
    expect(sanitizePostHtml(html)).toBe('<p><a>bad</a><a>relative</a><a>malformed</a><a href="https://example.com">safe</a></p>');
  });

  it("blocks links with userinfo, including encoded and empty usernames", () => {
    const html = '<p><a href="https://ntusa.ntu.edu.tw@evil.example/login">login</a> <a href="https://ntusa.ntu.edu.tw&#64;evil.example/login">encoded</a> <a href="https://@evil.example/">empty</a></p>';
    expect(hasCredentialedPostLink(html)).toBe(true);
    expect(sanitizePostHtml(html)).toBe('<p><a>login</a> <a>encoded</a> <a>empty</a></p>');
  });

  it("keeps ordinary @ characters outside the URL authority", () => {
    const html = '<p><a href="https://example.com/@student?email=a@b.com">profile</a></p>';
    expect(hasCredentialedPostLink(html)).toBe(false);
    expect(sanitizePostHtml(html)).toBe(html);
  });

  it("lists the actual destination host once per distinct link for reviewers", () => {
    const html = '<p><a href="https://events.example.com/a">A</a><a href="https://events.example.com/a">Again</a><a href="/about">About</a><a href="https://trusted.example@evil.example">Bad</a></p>';
    expect(getPostLinkDestinations(html)).toEqual([
      { href: "https://events.example.com/a", hostname: "events.example.com" },
      { href: "/about", hostname: null },
    ]);
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
