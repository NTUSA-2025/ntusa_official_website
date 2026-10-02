import { describe, expect, it } from "vitest";
import { pathFromLegacyHomeHash } from "./legacy-home-hash";

describe("pathFromLegacyHomeHash", () => {
  it("maps former home fragments to their routes", () => {
    expect(pathFromLegacyHomeHash("#home")).toBe("/");
    expect(pathFromLegacyHomeHash("#about")).toBe("/about");
    expect(pathFromLegacyHomeHash("announcements")).toBe("/announcements");
    expect(pathFromLegacyHomeHash("#cases")).toBe("/cases");
    expect(pathFromLegacyHomeHash("#forms/")).toBe("/forms");
    expect(pathFromLegacyHomeHash("#data")).toBe("/data");
  });

  it("normalizes case and rejects unknown fragments", () => {
    expect(pathFromLegacyHomeHash("#About")).toBe("/about");
    expect(pathFromLegacyHomeHash("")).toBeNull();
    expect(pathFromLegacyHomeHash("#unknown")).toBeNull();
  });
});
