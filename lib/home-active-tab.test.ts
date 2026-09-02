import { describe, expect, it } from "vitest";
import { tabFromHashFragment } from "./home-active-tab";

describe("tabFromHashFragment", () => {
  it("maps empty or missing fragment to home", () => {
    expect(tabFromHashFragment("")).toBe("home");
    expect(tabFromHashFragment("#")).toBe("home");
  });

  it("strips leading hash", () => {
    expect(tabFromHashFragment("#about")).toBe("about");
    expect(tabFromHashFragment("announcements")).toBe("announcements");
  });

  it("is case-insensitive and handles trailing slashes", () => {
    expect(tabFromHashFragment("#About")).toBe("about");
    expect(tabFromHashFragment("#about/")).toBe("about");
    expect(tabFromHashFragment("Announcements/")).toBe("announcements");
  });

  it("maps known sections", () => {
    expect(tabFromHashFragment("#data")).toBe("data");
    expect(tabFromHashFragment("forms")).toBe("forms");
  });

  it("falls back to home for unknown fragments", () => {
    expect(tabFromHashFragment("#nope")).toBe("home");
    expect(tabFromHashFragment("unknown-section")).toBe("home");
  });
});
