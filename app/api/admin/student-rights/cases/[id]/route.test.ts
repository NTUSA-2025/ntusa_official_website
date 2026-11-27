import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { PATCH } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: {
    $transaction: vi.fn(),
  },
}));

const inforSession = {
  user: { email: "Admin@ntusa.ntu.edu.tw", role: "admin", department: "資訊部" },
};

const params = { params: Promise.resolve({ id: "case-1" }) };

describe("PATCH /api/admin/student-rights/cases/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated and unauthorized users", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req1 = new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "摘要" }),
    });
    expect((await PATCH(req1, params)).status).toBe(401);

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "academic@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
    } as never);
    const req2 = new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "摘要" }),
    });
    expect((await PATCH(req2, params)).status).toBe(403);
  });

  it("returns 404 when the case does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(inforSession as never);
    const tx = {
      publicCase: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

    const req = new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "更新摘要" }),
    });

    const response = await PATCH(req, params);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ errorCode: "CASE_NOT_FOUND" });
  });

  it("returns 400 on validation errors", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(inforSession as never);
    const req = new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "   " }),
    });

    const response = await PATCH(req, params);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ errorCode: "PUBLIC_SUMMARY_REQUIRED" });
  });

  it("syncs latest public timeline event when publishing a private case", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(inforSession as never);
    const before = {
      id: "case-1",
      openedAt: new Date("2026-09-01T12:00:00.000Z"),
      publicSummary: "舊摘要",
      currentSituation: "舊進度",
      isPublic: false,
    };
    const after = {
      ...before,
      publicSummary: "新摘要",
      currentSituation: "最新公開進度",
      isPublic: true,
      updatedBy: "admin@ntusa.ntu.edu.tw",
    };
    const tx = {
      publicCase: {
        findUnique: vi.fn().mockResolvedValue(before),
        update: vi.fn().mockResolvedValue(after),
      },
      caseTimelineEvent: {
        findFirst: vi.fn().mockResolvedValue({ publicNote: "最新公開進度" }),
      },
      caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

    const req = new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "新摘要", isPublic: true }),
    });

    const response = await PATCH(req, params);

    expect(response.status).toBe(200);
    expect(tx.publicCase.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: {
        openedAt: before.openedAt,
        publicSummary: "新摘要",
        currentSituation: "最新公開進度",
        isPublic: true,
        updatedBy: "admin@ntusa.ntu.edu.tw",
      },
    });
    expect(tx.caseAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor: "admin@ntusa.ntu.edu.tw",
        action: "PUBLISH",
        targetType: "PUBLIC_CASE",
        targetId: "case-1",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/cases");
  });

  it("records HIDE and UPDATE audit actions appropriately", async () => {
    vi.mocked(getServerSession).mockResolvedValue(inforSession as never);
    const publicCase = {
      id: "case-1",
      openedAt: new Date("2026-09-01T12:00:00.000Z"),
      publicSummary: "摘要",
      currentSituation: "進度",
      isPublic: true,
    };

    const txHide = {
      publicCase: {
        findUnique: vi.fn().mockResolvedValue(publicCase),
        update: vi.fn().mockResolvedValue({ ...publicCase, isPublic: false }),
      },
      caseTimelineEvent: { findFirst: vi.fn() },
      caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (fn) => fn(txHide as never));

    const hideRes = await PATCH(new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "摘要", isPublic: false }),
    }), params);
    expect(hideRes.status).toBe(200);
    expect(txHide.caseTimelineEvent.findFirst).not.toHaveBeenCalled();
    expect(txHide.caseAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "HIDE" }),
    });

    const txUpdate = {
      publicCase: {
        findUnique: vi.fn().mockResolvedValue(publicCase),
        update: vi.fn().mockResolvedValue({ ...publicCase, publicSummary: "微調摘要" }),
      },
      caseTimelineEvent: { findFirst: vi.fn() },
      caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementationOnce(async (fn) => fn(txUpdate as never));

    const updateRes = await PATCH(new Request("http://localhost/api/admin/student-rights/cases/case-1", {
      method: "PATCH",
      body: JSON.stringify({ publicSummary: "微調摘要" }),
    }), params);
    expect(updateRes.status).toBe(200);
    expect(txUpdate.caseAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "UPDATE" }),
    });
  });
});
