import { describe, expect, it } from "vitest";
import { serializeLocaleCookie } from "./locale-cookie";

describe("serializeLocaleCookie", () => {
  it("marks the locale cookie as Secure on HTTPS origins", () => {
    expect(serializeLocaleCookie("en", true)).toContain("; Secure");
  });

  it("keeps local HTTP development cookies usable", () => {
    expect(serializeLocaleCookie("zh-TW", false)).not.toContain("; Secure");
  });
});
