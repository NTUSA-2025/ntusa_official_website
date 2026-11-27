import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import proxy from "./proxy";

describe("proxy security headers and cookie attributes", () => {
  it("enforces SameSite=Strict and Secure on NEXT_LOCALE cookie on HTTPS requests", () => {
    const request = new NextRequest(new URL("https://ntusa.ntu.edu.tw/"));
    const response = proxy(request);

    const cookie = response.cookies.get("NEXT_LOCALE");
    expect(cookie).toBeDefined();
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.secure).toBe(true);
    expect(cookie?.path).toBe("/");
  });

  it("preserves existing valid locale and applies SameSite=Strict", () => {
    const request = new NextRequest(new URL("https://ntusa.ntu.edu.tw/"), {
      headers: {
        cookie: "NEXT_LOCALE=en",
      },
    });
    const response = proxy(request);

    const cookie = response.cookies.get("NEXT_LOCALE");
    expect(cookie).toBeDefined();
    expect(cookie?.value).toBe("en");
    expect(cookie?.sameSite).toBe("strict");
    expect(cookie?.secure).toBe(true);
  });

  it("resolves locale from Accept-Language header and falls back to defaultLocale", () => {
    const enReq = new NextRequest(new URL("https://ntusa.ntu.edu.tw/"), {
      headers: { "accept-language": "en-US,en;q=0.9,zh-TW;q=0.8" },
    });
    expect(proxy(enReq).cookies.get("NEXT_LOCALE")?.value).toBe("en");

    const zhReq = new NextRequest(new URL("https://ntusa.ntu.edu.tw/"), {
      headers: { "accept-language": "zh-TW,zh;q=0.9" },
    });
    expect(proxy(zhReq).cookies.get("NEXT_LOCALE")?.value).toBe("zh-TW");

    const unsupportedReq = new NextRequest(new URL("https://ntusa.ntu.edu.tw/"), {
      headers: { "accept-language": "ja-JP,ja;q=0.9" },
    });
    expect(proxy(unsupportedReq).cookies.get("NEXT_LOCALE")?.value).toBe("zh-TW");
  });

  it("respects x-forwarded-proto for Secure attribute on local HTTP vs proxied HTTPS", () => {
    const httpReq = new NextRequest(new URL("http://localhost:3000/"));
    expect(proxy(httpReq).cookies.get("NEXT_LOCALE")?.secure).toBe(false);

    const proxiedHttpsReq = new NextRequest(new URL("http://localhost:3000/"), {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(proxy(proxiedHttpsReq).cookies.get("NEXT_LOCALE")?.secure).toBe(true);
  });
});
