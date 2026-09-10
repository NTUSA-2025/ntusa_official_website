import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as createMinute, GET as listMinutes } from "../app/api/minutes/route";
import { DELETE as deleteMinute } from "../app/api/minutes/[id]/route";
import { getServerSession } from "next-auth/next";
import prisma from "./prisma";

vi.mock("next-auth/next", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("./prisma", () => ({
  default: {
    meetingMinute: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: Function) => fn,
}));

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedPrisma = vi.mocked(prisma);

describe("Meeting Minutes API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/minutes", () => {
    it("returns 401 if unauthenticated", async () => {
      mockedGetServerSession.mockResolvedValueOnce(null);

      const request = new Request("http://localhost/api/minutes", {
        method: "POST",
        body: JSON.stringify({ title: "Test", date: "2026-09-10", url: "https://drive.google.com/test" }),
      });

      const response = await createMinute(request);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.errorCode).toBe("UNAUTHORIZED");
    });

    it("returns 403 if user email is not @ntusa.ntu.edu.tw", async () => {
      mockedGetServerSession.mockResolvedValueOnce({
        user: { email: "external@gmail.com", name: "External" },
        expires: "",
      } as any);

      const request = new Request("http://localhost/api/minutes", {
        method: "POST",
        body: JSON.stringify({ title: "Test", date: "2026-09-10", url: "https://drive.google.com/test" }),
      });

      const response = await createMinute(request);
      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.errorCode).toBe("FORBIDDEN");
    });

    it("returns 400 if title or date or url is missing or invalid", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { email: "member@ntusa.ntu.edu.tw", name: "Member" },
        expires: "",
      } as any);

      // missing title
      let req = new Request("http://localhost/api/minutes", {
        method: "POST",
        body: JSON.stringify({ title: "", date: "2026-09-10", url: "https://drive.google.com" }),
      });
      let res = await createMinute(req);
      expect(res.status).toBe(400);

      // invalid date
      req = new Request("http://localhost/api/minutes", {
        method: "POST",
        body: JSON.stringify({ title: "Valid", date: "not-a-date", url: "https://drive.google.com" }),
      });
      res = await createMinute(req);
      expect(res.status).toBe(400);

      // invalid url
      req = new Request("http://localhost/api/minutes", {
        method: "POST",
        body: JSON.stringify({ title: "Valid", date: "2026-09-10", url: "not-url" }),
      });
      res = await createMinute(req);
      expect(res.status).toBe(400);
    });

    it("creates a meeting minute successfully for authorized user", async () => {
      mockedGetServerSession.mockResolvedValueOnce({
        user: { email: "officer@ntusa.ntu.edu.tw", name: "Officer", department: "會本部" },
        expires: "",
      } as any);

      const createdObj = {
        id: "m-123",
        title: "第 38 屆行政會議",
        date: "2026-09-10",
        url: "https://drive.google.com/file/d/abc",
        authorEmail: "officer@ntusa.ntu.edu.tw",
        authorName: "Officer",
        department: "會本部",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockedPrisma.meetingMinute.create as any).mockResolvedValueOnce(createdObj);

      const req = new Request("http://localhost/api/minutes", {
        method: "POST",
        body: JSON.stringify({
          title: "第 38 屆行政會議",
          date: "2026-09-10",
          url: "https://drive.google.com/file/d/abc",
        }),
      });

      const res = await createMinute(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.id).toBe("m-123");
      expect(data.title).toBe("第 38 屆行政會議");
      expect(mockedPrisma.meetingMinute.create).toHaveBeenCalledWith({
        data: {
          title: "第 38 屆行政會議",
          date: "2026-09-10",
          url: "https://drive.google.com/file/d/abc",
          authorEmail: "officer@ntusa.ntu.edu.tw",
          authorName: "Officer",
          department: "會本部",
        },
      });
    });
  });

  describe("DELETE /api/minutes/[id]", () => {
    it("allows author to delete their minute", async () => {
      mockedGetServerSession.mockResolvedValueOnce({
        user: { email: "author@ntusa.ntu.edu.tw" },
        expires: "",
      } as any);

      (mockedPrisma.meetingMinute.findUnique as any).mockResolvedValueOnce({
        id: "m-1",
        authorEmail: "author@ntusa.ntu.edu.tw",
      });

      const req = new Request("http://localhost/api/minutes/m-1", { method: "DELETE" });
      const res = await deleteMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(200);
      expect(mockedPrisma.meetingMinute.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
    });

    it("rejects non-author without admin/reviewer role", async () => {
      mockedGetServerSession.mockResolvedValueOnce({
        user: { email: "other@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
        expires: "",
      } as any);

      (mockedPrisma.meetingMinute.findUnique as any).mockResolvedValueOnce({
        id: "m-1",
        authorEmail: "author@ntusa.ntu.edu.tw",
      });

      const req = new Request("http://localhost/api/minutes/m-1", { method: "DELETE" });
      const res = await deleteMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(403);
    });

    it("allows admin or reviewer to delete any minute", async () => {
      mockedGetServerSession.mockResolvedValueOnce({
        user: { email: "admin@ntusa.ntu.edu.tw", role: "admin" },
        expires: "",
      } as any);

      (mockedPrisma.meetingMinute.findUnique as any).mockResolvedValueOnce({
        id: "m-1",
        authorEmail: "author@ntusa.ntu.edu.tw",
      });

      const req = new Request("http://localhost/api/minutes/m-1", { method: "DELETE" });
      const res = await deleteMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(200);
      expect(mockedPrisma.meetingMinute.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
    });
  });
});
