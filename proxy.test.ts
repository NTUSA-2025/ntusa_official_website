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
});
