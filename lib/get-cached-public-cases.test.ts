import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "./prisma";
import { getCachedPublicCases } from "./get-cached-public-cases";

vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));
vi.mock("./prisma", () => ({
  default: {
    publicCase: { findMany: vi.fn() },
  },
}));

describe("getCachedPublicCases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serializes public cases and uses latest public event note as currentSituation", async () => {
    vi.mocked(prisma.publicCase.findMany).mockResolvedValueOnce([
      {
        id: "case-1",
        number: 7,
        openedAt: new Date("2026-10-01T12:00:00.000Z"),
        publicSummary: "學餐衛生改善",
        updatedAt: new Date("2026-10-10T12:00:00.000Z"),
        timelineEvents: [
          { id: "e-2", occurredAt: new Date("2026-10-10T12:00:00.000Z"), publicNote: "已完成複查" },
        ],
      },
    ] as never);

    const result = await getCachedPublicCases();

    expect(result).toEqual([
      {
        id: "case-1",
        number: 7,
        openedAt: "2026-10-01T12:00:00.000Z",
        currentSituation: "已完成複查",
        publicSummary: "學餐衛生改善",
        updatedAt: "2026-10-10T12:00:00.000Z",
        timelineEvents: [
          { id: "e-2", occurredAt: "2026-10-10T12:00:00.000Z", publicNote: "已完成複查" },
        ],
      },
    ]);
  });

  it("returns empty array when table is missing or query fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(prisma.publicCase.findMany).mockRejectedValueOnce({ code: "P2021" });
    await expect(getCachedPublicCases()).resolves.toEqual([]);

    vi.mocked(prisma.publicCase.findMany).mockRejectedValueOnce(new Error("db timeout"));
    await expect(getCachedPublicCases()).resolves.toEqual([]);
    vi.restoreAllMocks();
  });
});
