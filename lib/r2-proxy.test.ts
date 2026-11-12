import { describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL = "https://pub-test.r2.dev";
});

import { proxyR2Html, proxyR2Url, unproxyR2Html } from "./r2-proxy";

describe("R2 image URLs in the editor", () => {
  it("uses the same-origin proxy for an uploaded image", () => {
    expect(proxyR2Url("https://pub-test.r2.dev/photo.webp")).toBe("/r2/photo.webp");
  });

  it("previews existing images through the proxy and restores canonical URLs for saving", () => {
    const content = '<p><img src="https://pub-test.r2.dev/photo.webp" alt="Photo"></p>';
    expect(unproxyR2Html(proxyR2Html(content))).toBe(content);
  });

  it("does not rewrite unrelated image URLs", () => {
    const content = '<p><img src="https://example.com/photo.webp"></p>';
    expect(proxyR2Html(content)).toBe(content);
    expect(unproxyR2Html(content)).toBe(content);
  });
});
