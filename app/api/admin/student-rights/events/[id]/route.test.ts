import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DELETE, PATCH } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

const session = {
  user: { email: "Rights@ntusa.ntu.edu.tw", role: "editor", department: "學權部" },
};
const params = { params: Promise.resolve({ id: "event-1" }) };

describe("/api/admin/student-rights/events/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH", () => {
    it("rejects unauthenticated and unauthorized users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const req1 = new Request("http://localhost/api/admin/student-rights/events/event-1", {
        method: "PATCH",
        body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "進度" }),
      });
      expect((await PATCH(req1, params)).status).toBe(401);

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "other@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);
      const req2 = new Request("http://localhost/api/admin/student-rights/events/event-1", {
        method: "PATCH",
        body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "進度" }),
      });
      expect((await PATCH(req2, params)).status).toBe(403);
    });

    it("returns 404 when the event does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
      const tx = { caseTimelineEvent: { findUnique: vi.fn().mockResolvedValue(null) } };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

      const req = new Request("http://localhost/api/admin/student-rights/events/event-1", {
        method: "PATCH",
        body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "進度" }),
      });

      const response = await PATCH(req, params);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ errorCode: "EVENT_NOT_FOUND" });
    });

    it("blocks publishing an event if the parent case is private", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
      const tx = {
        caseTimelineEvent: {
          findUnique: vi.fn().mockResolvedValue({ id: "event-1", caseId: "case-1", isPublic: false }),
          update: vi.fn(),
        },
        publicCase: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "case-1", isPublic: false }),
        },
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

      const req = new Request("http://localhost/api/admin/student-rights/events/event-1", {
        method: "PATCH",
        body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "進度", isPublic: true }),
      });

      const response = await PATCH(req, params);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ errorCode: "CASE_MUST_BE_PUBLIC" });
      expect(tx.caseTimelineEvent.update).not.toHaveBeenCalled();
    });

    it("updates event, refreshes currentSituation, and logs PUBLISH/HIDE/UPDATE action", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
      const before = {
        id: "event-1",
        caseId: "case-1",
        occurredAt: new Date("2026-10-01T12:00:00.000Z"),
        publicNote: "舊進度",
        isPublic: true,
      };
      const after = {
        ...before,
        publicNote: "更新後進度",
        isPublic: false,
      };
      const tx = {
        caseTimelineEvent: {
          findUnique: vi.fn().mockResolvedValue(before),
          update: vi.fn().mockResolvedValue(after),
          findFirst: vi.fn().mockResolvedValue({ publicNote: "另一筆公開進度" }),
        },
        publicCase: {
          findUniqueOrThrow: vi.fn().mockResolvedValue({ id: "case-1", isPublic: true }),
          update: vi.fn().mockResolvedValue({}),
        },
        caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

      const req = new Request("http://localhost/api/admin/student-rights/events/event-1", {
        method: "PATCH",
        body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "更新後進度", isPublic: false }),
      });

      const response = await PATCH(req, params);

      expect(response.status).toBe(200);
      expect(tx.publicCase.update).toHaveBeenCalledWith({
        where: { id: "case-1" },
        data: { currentSituation: "另一筆公開進度", updatedBy: "rights@ntusa.ntu.edu.tw" },
      });
      expect(tx.caseAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actor: "rights@ntusa.ntu.edu.tw",
          action: "HIDE",
          targetType: "TIMELINE_EVENT",
          targetId: "event-1",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/cases");
    });
  });

  describe("DELETE", () => {
    it("rejects unauthenticated and unauthorized users", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      expect((await DELETE(new Request("http://localhost"), params)).status).toBe(401);

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "other@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);
      expect((await DELETE(new Request("http://localhost"), params)).status).toBe(403);
    });

    it("returns 404 when the event does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
      const tx = { caseTimelineEvent: { findUnique: vi.fn().mockResolvedValue(null) } };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

      const response = await DELETE(new Request("http://localhost"), params);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ errorCode: "EVENT_NOT_FOUND" });
    });

    it("deletes event, syncs remaining public progress, logs audit, and returns 204", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
      const before = { id: "event-1", caseId: "case-1", publicNote: "舊進度", isPublic: true };
      const tx = {
        caseTimelineEvent: {
          findUnique: vi.fn().mockResolvedValue(before),
          delete: vi.fn().mockResolvedValue(before),
          findFirst: vi.fn().mockResolvedValue({ publicNote: "前次公開進度" }),
        },
        publicCase: { update: vi.fn().mockResolvedValue({}) },
        caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
      };
      vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

      const response = await DELETE(new Request("http://localhost"), params);

      expect(response.status).toBe(204);
      expect(tx.caseTimelineEvent.delete).toHaveBeenCalledWith({ where: { id: "event-1" } });
      expect(tx.publicCase.update).toHaveBeenCalledWith({
        where: { id: "case-1" },
        data: { currentSituation: "前次公開進度", updatedBy: "rights@ntusa.ntu.edu.tw" },
      });
      expect(tx.caseAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actor: "rights@ntusa.ntu.edu.tw",
          action: "DELETE",
          targetType: "TIMELINE_EVENT",
          targetId: "event-1",
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith("/");
      expect(revalidatePath).toHaveBeenCalledWith("/cases");
    });
  });
});
