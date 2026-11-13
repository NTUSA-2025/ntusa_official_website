import { describe, expect, it } from "vitest";
import { parsePostLinkInput } from "./post-link-url";

describe("parsePostLinkInput", () => {
  it("adds https to a pasted domain and keeps paths and ports", () => {
    expect(parsePostLinkInput(" example.com/events ")).toEqual({ href: "https://example.com/events" });
    expect(parsePostLinkInput("example.com:8080/info")).toEqual({ href: "https://example.com:8080/info" });
  });

  it("keeps an explicit http URL", () => {
    expect(parsePostLinkInput("http://example.com/event")).toEqual({ href: "http://example.com/event" });
  });

  it("rejects unsupported and malformed URLs", () => {
    expect(parsePostLinkInput("")).toEqual({ error: "invalid" });
    expect(parsePostLinkInput("javascript:alert(1)")).toEqual({ error: "invalid" });
    expect(parsePostLinkInput("//example.com")).toEqual({ error: "invalid" });
    expect(parsePostLinkInput("https://")).toEqual({ error: "invalid" });
  });

  it("identifies disguised destinations containing credentials", () => {
    expect(parsePostLinkInput("https://ntusa.ntu.edu.tw@evil.example/login")).toEqual({ error: "credentials" });
    expect(parsePostLinkInput("user:password@evil.example")).toEqual({ error: "invalid" });
  });
});
