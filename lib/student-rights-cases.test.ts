import { describe, expect, it } from "vitest";
import { CaseValidationError, parseCaseInput, parseEventInput, publicCaseSort } from "./student-rights-cases";

describe("student-rights public case input", () => {
  it("normalizes case numbers and defaults publishing to undefined", () => {
    expect(parseCaseInput({ publicCaseNo: " sr-2026-001 ", openedAt: "2026-08-01", source: "陳情表單", currentStatus: "行政協調", currentSituation: "已聯繫相關單位", publicSummary: "已匿名化摘要" }))
      .toMatchObject({ publicCaseNo: "SR-2026-001", source: "陳情表單", isPublic: undefined });
  });

  it("rejects invalid public case numbers and dates", () => {
    expect(() => parseCaseInput({ publicCaseNo: "SR 1", openedAt: "2026-08-01", source: "信件", currentStatus: "行政協調", currentSituation: "處理中", publicSummary: "摘要" })).toThrow(CaseValidationError);
    expect(() => parseCaseInput({ publicCaseNo: "SR-1", openedAt: "2026-02-31", source: "信件", currentStatus: "行政協調", currentSituation: "處理中", publicSummary: "摘要" })).toThrow(CaseValidationError);
    expect(() => parseEventInput({ occurredAt: "2026/10/02", status: "回覆", publicNote: "說明" })).toThrow(CaseValidationError);
  });

  it("sorts events by occurrence and creation time", () => {
    const first = { occurredAt: new Date("2026-01-01T12:00:00Z"), createdAt: new Date("2026-01-02T12:00:00Z"), id: "second" };
    const second = { occurredAt: new Date("2026-01-01T12:00:00Z"), createdAt: new Date("2026-01-01T12:00:00Z"), id: "first" };
    expect(publicCaseSort([first, second]).map((event) => event.id)).toEqual(["first", "second"]);
  });

  it("stores progress timestamps entered in Taipei local time", () => {
    const event = parseEventInput({ occurredAt: "2026-09-25T11:30", status: "行政協調", publicNote: "處理中" });
    expect(event.occurredAt.toISOString()).toBe("2026-09-25T03:30:00.000Z");
  });
});
