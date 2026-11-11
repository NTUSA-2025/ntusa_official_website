import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "./prisma";
import { getPublicMeetingMinutes } from "./get-public-meeting-minutes";

vi.mock("./prisma", () => ({
  default: { meetingMinute: { findMany: vi.fn() } },
}));

describe("getPublicMeetingMinutes", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns database records without uploader metadata", async () => {
    vi.mocked(prisma.meetingMinute.findMany).mockResolvedValueOnce([{
      id: "m-1",
      date: "2026-09-25",
      title: "test_1",
      url: "https://example.com/minutes",
      authorEmail: "author@ntusa.ntu.edu.tw",
      authorName: "Author",
      department: "資訊部",
      createdAt: new Date(),
      updatedAt: new Date(),
    }]);

    await expect(getPublicMeetingMinutes()).resolves.toEqual([{
      id: "m-1",
      date: "2026-09-25",
      title: "test_1",
      file: "https://example.com/minutes",
    }]);
    expect(prisma.meetingMinute.findMany).toHaveBeenCalledWith({
      orderBy: { date: "desc" },
      select: { id: true, date: true, title: true, url: true },
    });
  });

  it("does not turn a database failure into an empty published list", async () => {
    const error = new Error("database unavailable");
    vi.mocked(prisma.meetingMinute.findMany).mockRejectedValueOnce(error);

    await expect(getPublicMeetingMinutes()).rejects.toBe(error);
  });
});
