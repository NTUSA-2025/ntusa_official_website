import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { POST } from "./route";

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
const params = { params: Promise.resolve({ id: "case-1" }) };

describe("POST /api/admin/student-rights/cases/[id]/events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated and unauthorized users", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req1 = new Request("http://localhost/api/admin/student-rights/cases/case-1/events", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect((await POST(req1, params)).status).toBe(401);

    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "pr@ntusa.ntu.edu.tw", role: "reviewer", department: "公關部" },
    } as never);
    const req2 = new Request("http://localhost/api/admin/student-rights/cases/case-1/events", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect((await POST(req2, params)).status).toBe(403);
  });

  it("returns 404 when the parent case does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
    const tx = { publicCase: { findUnique: vi.fn().mockResolvedValue(null) } };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

    const req = new Request("http://localhost/api/admin/student-rights/cases/case-1/events", {
      method: "POST",
      body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "新進度" }),
    });

    const response = await POST(req, params);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ errorCode: "CASE_NOT_FOUND" });
  });

  it("rejects publishing a timeline event when the parent case is private", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
    const tx = {
      publicCase: { findUnique: vi.fn().mockResolvedValue({ id: "case-1", isPublic: false }) },
      caseTimelineEvent: { create: vi.fn() },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

    const req = new Request("http://localhost/api/admin/student-rights/cases/case-1/events", {
      method: "POST",
      body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: "新進度", isPublic: true }),
    });

    const response = await POST(req, params);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ errorCode: "CASE_MUST_BE_PUBLIC" });
    expect(tx.caseTimelineEvent.create).not.toHaveBeenCalled();
  });

  it("creates event, updates case currentSituation from newest public event, and logs audit", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(session as never);
    const createdEvent = {
      id: "event-2",
      caseId: "case-1",
      occurredAt: new Date("2026-10-01T12:00:00.000Z"),
      publicNote: "校方已回覆",
      isPublic: true,
    };
    const tx = {
      publicCase: {
        findUnique: vi.fn().mockResolvedValue({ id: "case-1", isPublic: true }),
        update: vi.fn().mockResolvedValue({}),
      },
      caseTimelineEvent: {
        create: vi.fn().mockResolvedValue(createdEvent),
        findFirst: vi.fn().mockResolvedValue(createdEvent),
      },
      caseAuditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(prisma.$transaction).mockImplementation(async (fn) => fn(tx as never));

    const req = new Request("http://localhost/api/admin/student-rights/cases/case-1/events", {
      method: "POST",
      body: JSON.stringify({ occurredAt: "2026-10-01", publicNote: " 校方已回覆 ", isPublic: true }),
    });

    const response = await POST(req, params);

    expect(response.status).toBe(201);
    expect(tx.publicCase.update).toHaveBeenCalledWith({
      where: { id: "case-1" },
      data: { currentSituation: "校方已回覆", updatedBy: "rights@ntusa.ntu.edu.tw" },
    });
    expect(tx.caseAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor: "rights@ntusa.ntu.edu.tw",
        action: "CREATE",
        targetType: "TIMELINE_EVENT",
        targetId: "event-2",
      }),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/cases");
  });
});
