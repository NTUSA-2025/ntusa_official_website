import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { PATCH } from "./route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { $transaction: vi.fn() } }));

const admin = { expires: "2099-01-01", user: { email: "admin@ntusa.ntu.edu.tw", role: "admin", department: "資訊部" } };
const tag = { id: "tag-1", name: "交通", nameKey: "交通", createdAt: new Date("2026-11-19T00:00:00Z") };
const tx = {
  caseTag: { findUnique: vi.fn(), update: vi.fn() },
  caseAuditLog: { create: vi.fn() },
};

function request(name: string) {
  return new Request("http://localhost/api/admin/student-rights/tags/tag-1", { method: "PATCH", body: JSON.stringify({ name }) });
}

const params = { params: Promise.resolve({ id: "tag-1" }) };

describe("student rights tag rename API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(admin as Awaited<ReturnType<typeof getServerSession>>);
    vi.mocked(prisma.$transaction).mockImplementation((async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx)) as never);
    tx.caseTag.findUnique.mockResolvedValue(tag);
    tx.caseTag.update.mockResolvedValue({ ...tag, name: "校園交通", nameKey: "校園交通" });
    tx.caseAuditLog.create.mockResolvedValue({});
  });

  it("lets an admin rename a tag, records the change, and refreshes public cases", async () => {
    const response = await PATCH(request(" 校園交通 "), params);
    expect(response.status).toBe(200);
    expect(tx.caseTag.update).toHaveBeenCalledWith({ where: { id: "tag-1" }, data: { name: "校園交通", nameKey: "校園交通" } });
    expect(tx.caseAuditLog.create).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/cases");
  });

  it("blocks editors outside the student rights department", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ expires: "2099-01-01", user: { email: "editor@ntusa.ntu.edu.tw", role: "editor", department: "資訊部" } });
    const response = await PATCH(request("校園交通"), params);
    expect(response.status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const response = await PATCH(request("  "), params);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ errorCode: "TAG_NAME_REQUIRED" });
  });

  it("reports transaction acquisition timeouts", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      vi.mocked(prisma.$transaction).mockRejectedValue({ code: "P2028", message: "Unable to start a transaction in the given time." });
      const response = await PATCH(request("校園交通"), params);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ errorCode: "DATABASE_UNAVAILABLE" });
    } finally {
      log.mockRestore();
    }
  });
});
