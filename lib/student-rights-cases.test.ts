import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import { assertProgressVisibilityAllowed, canViewStudentRightsCaseAudit, CaseValidationError, isStudentRightsCaseManager, latestPublicProgress, parseCaseInput, parseEventInput, publicCaseSort } from "./student-rights-cases";

function sessionFor(role: Session["user"]["role"], department: string): Session {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: { email: "member@ntusa.ntu.edu.tw", role, department },
  };
}

describe("student-rights public case input", () => {
  it("accepts case details without a manually entered number, source, or progress status", () => {
    expect(parseCaseInput({ openedAt: "2026-08-01", currentSituation: "已聯繫相關單位", publicSummary: "已匿名化摘要" }))
      .toMatchObject({ currentSituation: "已聯繫相關單位", isPublic: undefined });
  });

  it("rejects invalid dates and timestamps with a time component", () => {
    expect(() => parseCaseInput({ openedAt: "2026-02-31", currentSituation: "處理中", publicSummary: "摘要" })).toThrow(CaseValidationError);
    expect(() => parseEventInput({ occurredAt: "2026/10/02", publicNote: "說明" })).toThrow(CaseValidationError);
    expect(() => parseEventInput({ occurredAt: "2026-09-25T11:30", publicNote: "說明" })).toThrow(CaseValidationError);
  });

  it("sorts events by occurrence and creation time", () => {
    const first = { occurredAt: new Date("2026-01-01T12:00:00Z"), createdAt: new Date("2026-01-02T12:00:00Z"), id: "second" };
    const second = { occurredAt: new Date("2026-01-01T12:00:00Z"), createdAt: new Date("2026-01-01T12:00:00Z"), id: "first" };
    expect(publicCaseSort([first, second]).map((event) => event.id)).toEqual(["first", "second"]);
  });

  it("stores progress dates without a time-of-day choice", () => {
    const event = parseEventInput({ occurredAt: "2026-09-25", publicNote: "處理中" });
    expect(event.occurredAt.toISOString()).toBe("2026-09-25T12:00:00.000Z");
  });

  it("locks progress visibility until the case is public", () => {
    expect(() => assertProgressVisibilityAllowed(false, false, true)).toThrow("CASE_MUST_BE_PUBLIC");
    expect(() => assertProgressVisibilityAllowed(false, true, false)).toThrow("CASE_MUST_BE_PUBLIC");
    expect(() => assertProgressVisibilityAllowed(false, false, false)).not.toThrow();
    expect(() => assertProgressVisibilityAllowed(false, true, true)).not.toThrow();
    expect(() => assertProgressVisibilityAllowed(true, false, true)).not.toThrow();
  });

  it("does not expose an unpublished current situation when no progress is public", () => {
    expect(latestPublicProgress([])).toBe("");
    expect(latestPublicProgress([{ publicNote: "公開進度" }])).toBe("公開進度");
  });

  it("only allows the student rights and information departments to view case audits", () => {
    expect(canViewStudentRightsCaseAudit(sessionFor("editor", "學權部"))).toBe(true);
    expect(canViewStudentRightsCaseAudit(sessionFor("admin", "資訊部"))).toBe(true);
    expect(canViewStudentRightsCaseAudit(sessionFor("editor", "學術部"))).toBe(false);
    expect(canViewStudentRightsCaseAudit(sessionFor("admin", "學術部"))).toBe(false);
    expect(canViewStudentRightsCaseAudit(null)).toBe(false);
  });

  it("only allows the student rights and information departments to manage cases", () => {
    expect(isStudentRightsCaseManager(sessionFor("editor", "學權部"))).toBe(true);
    expect(isStudentRightsCaseManager(sessionFor("admin", "資訊部"))).toBe(true);
    expect(isStudentRightsCaseManager(sessionFor("editor", "學術部"))).toBe(false);
    expect(isStudentRightsCaseManager(sessionFor("admin", "學術部"))).toBe(false);
    expect(isStudentRightsCaseManager(null)).toBe(false);
  });
});
