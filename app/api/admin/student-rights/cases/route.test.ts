import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { GET, POST } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    publicCase: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const studentRightsSession = {
  user: { email: "Officer@ntusa.ntu.edu.tw", role: "editor", department: "學權部" },
};

const otherDeptSession = {
  user: { email: "pr@ntusa.ntu.edu.tw", role: "reviewer", department: "公關部" },
};

describe("/api/admin/student-rights/cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("rejects unauthenticated and unauthorized users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      expect((await GET()).status).toBe(401);

      vi.mocked(getServerSession).mockResolvedValueOnce(otherDeptSession as never);
      expect((await GET()).status).toBe(403);
    });

    it("returns cases with timeline events for authorized departments", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(studentRightsSession as never);
      vi.mocked(prisma.publicCase.findMany).mockResolvedValueOnce([{ id: "case-1", number: 1 }] as never);

      const response = await GET();

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual([{ id: "case-1", number: 1 }]);
      expect(prisma.publicCase.findMany).toHaveBeenCalledWith({
        include: { timelineEvents: { orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }] } },
        orderBy: { number: "desc" },
      });
    });

    it("returns 503 MIGRATION_PENDING when tables are missing", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(studentRightsSession as never);
      vi.mocked(prisma.publicCase.findMany).mockRejectedValueOnce({ code: "P2021" });

      const response = await GET();

      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ errorCode: "MIGRATION_PENDING" });
    });

    it("returns 500 INTERNAL_ERROR on unexpected failures", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(getServerSession).mockResolvedValueOnce(studentRightsSession as never);
      vi.mocked(prisma.publicCase.findMany).mockRejectedValueOnce(new Error("db error"));

      const response = await GET();

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ errorCode: "INTERNAL_ERROR" });
    });
  });

  describe("POST", () => {
    it("rejects unauthenticated and unauthorized users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req1 = new Request("http://localhost/api/admin/student-rights/cases", {
        method: "POST",
        body: JSON.stringify({}),
      });
      expect((await POST(req1)).status).toBe(401);

      vi.mocked(getServerSession).mockResolvedValueOnce(otherDeptSession as never);
      const req2 = new Request("http://localhost/api/admin/student-rights/cases", {
        method: "POST",
        body: JSON.stringify({}),
      });
      expect((await POST(req2)).status).toBe(403);
    });

    it("returns 400 for invalid input payloads", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(studentRightsSession as never);
      const req = new Request("http://localhost/api/admin/student-rights/cases", {
        method: "POST",
        body: JSON.stringify({ openedAt: "2026-02-31", currentSituation: "進度", publicSummary: "摘要" }),
      });

      const response = await POST(req);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ errorCode: "OPENED_AT_INVALID" });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it("creates case, initial timeline event, and two audit logs in a transaction", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(studentRightsSession as never);

      const createdCase = {
        id: "case-1",
        number: 1,
        openedAt: new Date("2026-09-01T12:00:00.000Z"),
        currentSituation: "已函請校方說明",
        publicSummary: "校舍無障礙改善",
        isPublic: false,
        createdBy: "officer@ntusa.ntu.edu.tw",
        updatedBy: "officer@ntusa.ntu.edu.tw",
      };
      const createdEvent = {
        id: "event-1",
        caseId: "case-1",
        occurredAt: new Date("2026-09-01T12:00:00.000Z"),
        publicNote: "已函請校方說明",
        isPublic: false,
        createdBy: "officer@ntusa.ntu.edu.tw",
        updatedBy: "officer@ntusa.ntu.edu.tw",
      };

      const tx = {
        publicCase: { create: vi.fn().mockResolvedValue(createdCase) },
        caseTimelineEvent: { create: vi.fn().mockResolvedValue(createdEvent) },
        caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

      const req = new Request("http://localhost/api/admin/student-rights/cases", {
        method: "POST",
        body: JSON.stringify({
          openedAt: "2026-09-01",
          currentSituation: " 已函請校方說明 ",
          publicSummary: " 校舍無障礙改善 ",
        }),
      });

      const response = await POST(req);

      expect(response.status).toBe(201);
      expect(tx.publicCase.create).toHaveBeenCalledWith({
        data: {
          openedAt: new Date("2026-09-01T12:00:00.000Z"),
          currentSituation: "已函請校方說明",
          publicSummary: "校舍無障礙改善",
          isPublic: false,
          createdBy: "officer@ntusa.ntu.edu.tw",
          updatedBy: "officer@ntusa.ntu.edu.tw",
        },
      });
      expect(tx.caseTimelineEvent.create).toHaveBeenCalledWith({
        data: {
          caseId: "case-1",
          occurredAt: new Date("2026-09-01T12:00:00.000Z"),
          publicNote: "已函請校方說明",
          isPublic: false,
          createdBy: "officer@ntusa.ntu.edu.tw",
          updatedBy: "officer@ntusa.ntu.edu.tw",
        },
      });
      expect(tx.caseAuditLog.create).toHaveBeenCalledTimes(2);
      expect(tx.caseAuditLog.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          actor: "officer@ntusa.ntu.edu.tw",
          action: "CREATE",
          targetType: "PUBLIC_CASE",
          targetId: "case-1",
        }),
      });
      expect(tx.caseAuditLog.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({
          actor: "officer@ntusa.ntu.edu.tw",
          action: "CREATE",
          targetType: "TIMELINE_EVENT",
          targetId: "event-1",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/cases");
    });
  });
});
