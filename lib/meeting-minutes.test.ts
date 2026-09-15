import { describe, expect, it, vi, beforeEach } from "vitest";
import { POST as createMinute } from "../app/api/minutes/route";
import { DELETE as deleteMinute, PATCH as updateMinute } from "../app/api/minutes/[id]/route";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
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
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}));

const mockedGetServerSession = vi.mocked(getServerSession);
const mockedPrisma = vi.mocked(prisma);

function createMockSession(overrides?: Partial<Session["user"]>): Session {
  return {
    user: {
      email: "member@ntusa.ntu.edu.tw",
      name: "Test Member",
      role: "editor",
      department: "一般部門",
      ...overrides,
    },
    expires: "2099-01-01",
  };
}

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
      mockedGetServerSession.mockResolvedValueOnce(createMockSession({ email: "external@gmail.com" }));

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
      mockedGetServerSession.mockResolvedValue(createMockSession());

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
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "officer@ntusa.ntu.edu.tw", name: "Officer", department: "會本部" })
      );

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

      vi.mocked(mockedPrisma.meetingMinute.create).mockResolvedValueOnce(createdObj);

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
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "author@ntusa.ntu.edu.tw" })
      );

      vi.mocked(mockedPrisma.meetingMinute.findUnique).mockResolvedValueOnce({
        id: "m-1",
        title: "Minute 1",
        date: "2026-09-10",
        url: "https://drive.google.com/test",
        authorEmail: "author@ntusa.ntu.edu.tw",
        authorName: "Author",
        department: "公關部",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new Request("http://localhost/api/minutes/m-1", { method: "DELETE" });
      const res = await deleteMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(200);
      expect(mockedPrisma.meetingMinute.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
    });

    it("rejects non-author without admin/reviewer role", async () => {
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "other@ntusa.ntu.edu.tw", role: "editor", department: "學術部" })
      );

      vi.mocked(mockedPrisma.meetingMinute.findUnique).mockResolvedValueOnce({
        id: "m-1",
        title: "Minute 1",
        date: "2026-09-10",
        url: "https://drive.google.com/test",
        authorEmail: "author@ntusa.ntu.edu.tw",
        authorName: "Author",
        department: "公關部",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new Request("http://localhost/api/minutes/m-1", { method: "DELETE" });
      const res = await deleteMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(403);
    });

    it("allows admin or reviewer to delete any minute", async () => {
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "admin@ntusa.ntu.edu.tw", role: "admin" })
      );

      vi.mocked(mockedPrisma.meetingMinute.findUnique).mockResolvedValueOnce({
        id: "m-1",
        title: "Minute 1",
        date: "2026-09-10",
        url: "https://drive.google.com/test",
        authorEmail: "author@ntusa.ntu.edu.tw",
        authorName: "Author",
        department: "公關部",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const req = new Request("http://localhost/api/minutes/m-1", { method: "DELETE" });
      const res = await deleteMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(200);
      expect(mockedPrisma.meetingMinute.delete).toHaveBeenCalledWith({ where: { id: "m-1" } });
    });
  });

  describe("PATCH /api/minutes/[id]", () => {
    const existingMinute = {
      id: "m-1",
      title: "Original title",
      date: "2026-09-10",
      url: "https://drive.google.com/original",
      authorEmail: "author@ntusa.ntu.edu.tw",
      authorName: "Author",
      department: "公關部",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("allows the author to update a meeting minute", async () => {
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "author@ntusa.ntu.edu.tw" })
      );
      vi.mocked(mockedPrisma.meetingMinute.findUnique).mockResolvedValueOnce(existingMinute);

      const updatedMinute = {
        ...existingMinute,
        title: "Updated title",
        date: "2026-09-17",
        url: "https://drive.google.com/updated",
      };
      vi.mocked(mockedPrisma.meetingMinute.update).mockResolvedValueOnce(updatedMinute);

      const req = new Request("http://localhost/api/minutes/m-1", {
        method: "PATCH",
        body: JSON.stringify({
          title: updatedMinute.title,
          date: updatedMinute.date,
          url: updatedMinute.url,
        }),
      });
      const res = await updateMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(200);
      expect(mockedPrisma.meetingMinute.update).toHaveBeenCalledWith({
        where: { id: "m-1" },
        data: {
          title: updatedMinute.title,
          date: updatedMinute.date,
          url: updatedMinute.url,
        },
      });
    });

    it("rejects updates from a user without permission", async () => {
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "other@ntusa.ntu.edu.tw", role: "editor", department: "學術部" })
      );
      vi.mocked(mockedPrisma.meetingMinute.findUnique).mockResolvedValueOnce(existingMinute);

      const req = new Request("http://localhost/api/minutes/m-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated", date: "2026-09-17", url: "https://example.com" }),
      });
      const res = await updateMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(403);
      expect(mockedPrisma.meetingMinute.update).not.toHaveBeenCalled();
    });

    it("rejects invalid update input", async () => {
      mockedGetServerSession.mockResolvedValueOnce(
        createMockSession({ email: "author@ntusa.ntu.edu.tw" })
      );
      vi.mocked(mockedPrisma.meetingMinute.findUnique).mockResolvedValueOnce(existingMinute);

      const req = new Request("http://localhost/api/minutes/m-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated", date: "2026-09-17", url: "file:///private/document.pdf" }),
      });
      const res = await updateMinute(req, { params: Promise.resolve({ id: "m-1" }) });

      expect(res.status).toBe(400);
      expect(mockedPrisma.meetingMinute.update).not.toHaveBeenCalled();
    });
  });
});
