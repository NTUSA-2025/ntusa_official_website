import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import { GET } from "./route";

vi.mock("@/lib/prisma", () => ({
  default: {
    publicCase: {
      findMany: vi.fn(),
    },
  },
}));

describe("GET /api/student-rights/cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries only public cases and public timeline events and computes currentSituation", async () => {
    vi.mocked(prisma.publicCase.findMany).mockResolvedValueOnce([
      {
        number: 3,
        openedAt: new Date("2026-09-01T12:00:00.000Z"),
        publicSummary: "宿舍門禁調整",
        createdAt: new Date("2026-09-01T12:00:00.000Z"),
        updatedAt: new Date("2026-09-10T12:00:00.000Z"),
        timelineEvents: [
          {
            occurredAt: new Date("2026-09-10T12:00:00.000Z"),
            publicNote: "已召開協調會",
            createdAt: new Date("2026-09-10T12:00:00.000Z"),
            updatedAt: new Date("2026-09-10T12:00:00.000Z"),
          },
        ],
      },
      {
        number: 2,
        openedAt: new Date("2026-08-15T12:00:00.000Z"),
        publicSummary: "無公開進度之案件",
        createdAt: new Date("2026-08-15T12:00:00.000Z"),
        updatedAt: new Date("2026-08-15T12:00:00.000Z"),
        timelineEvents: [],
      },
    ] as never);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(prisma.publicCase.findMany).toHaveBeenCalledWith({
      where: { isPublic: true },
      select: {
        number: true,
        openedAt: true,
        publicSummary: true,
        createdAt: true,
        updatedAt: true,
        timelineEvents: {
          where: { isPublic: true },
          select: { occurredAt: true, publicNote: true, createdAt: true, updatedAt: true },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        },
      },
      orderBy: { number: "desc" },
    });

    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].currentSituation).toBe("已召開協調會");
    expect(data[1].currentSituation).toBe("");
    expect(data[0]).not.toHaveProperty("id");
  });

  it("returns an empty list when public case tables have not been migrated yet", async () => {
    vi.mocked(prisma.publicCase.findMany).mockRejectedValueOnce({ code: "P2021" });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("returns 500 INTERNAL_ERROR for unexpected database failures", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.publicCase.findMany).mockRejectedValueOnce(new Error("connection lost"));

    const response = await GET();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ errorCode: "INTERNAL_ERROR" });
  });
});
