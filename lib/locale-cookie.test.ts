import { describe, expect, it } from "vitest";
import { serializeLocaleCookie } from "./locale-cookie";

describe("serializeLocaleCookie", () => {
  it("marks the locale cookie as Secure by default", () => {
    expect(serializeLocaleCookie("en")).toContain("; Secure");
    expect(serializeLocaleCookie("en", true)).toContain("; Secure");
  });

  it("keeps local HTTP development cookies usable when secure is explicitly false", () => {
    expect(serializeLocaleCookie("zh-TW", false)).not.toContain("; Secure");
  });

  it("enforces SameSite=Strict attribute on serialized locale cookie", () => {
    expect(serializeLocaleCookie("zh-TW")).toContain("SameSite=Strict");
    expect(serializeLocaleCookie("en")).toContain("SameSite=Strict");
  });
});
