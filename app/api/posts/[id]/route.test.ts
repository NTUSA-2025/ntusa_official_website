import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { DELETE, PATCH } from "./route";

const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendEmail };
  },
}));
vi.mock("@/lib/prisma", () => ({
  default: {
    post: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const existingPost = {
  id: "post-1",
  title: "Original Post",
  content: "<p>Original body</p>",
  coverImage: "https://example.com/cover.webp",
  status: "REJECTED",
  rejectReason: "請補充時間",
  authorEmail: "Author@ntusa.ntu.edu.tw",
  department: "學術部",
};

const params = { params: Promise.resolve({ id: "post-1" }) };

describe("/api/posts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmail.mockResolvedValue({});
    vi.mocked(prisma.post.findUnique).mockResolvedValue(existingPost as never);
    vi.mocked(prisma.post.update).mockResolvedValue(existingPost as never);
    vi.mocked(prisma.post.delete).mockResolvedValue(existingPost as never);
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);

      const response = await DELETE(new Request("http://localhost/api/posts/post-1", { method: "DELETE" }), params);

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ errorCode: "UNAUTHORIZED" });
    });

    it("returns 404 when the post does not exist", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "admin@ntusa.ntu.edu.tw", role: "admin", department: "資訊部" },
      } as never);
      vi.mocked(prisma.post.findUnique).mockResolvedValueOnce(null);

      const response = await DELETE(new Request("http://localhost/api/posts/post-1", { method: "DELETE" }), params);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ errorCode: "POST_NOT_FOUND" });
    });

    it("forbids non-author editors even in the same department", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "colleague@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);

      const response = await DELETE(new Request("http://localhost/api/posts/post-1", { method: "DELETE" }), params);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ errorCode: "FORBIDDEN_DELETE" });
      expect(prisma.post.delete).not.toHaveBeenCalled();
    });

    it("allows the author (case-insensitive email) and reviewers/admins to delete", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "author@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);

      const authorRes = await DELETE(new Request("http://localhost/api/posts/post-1", { method: "DELETE" }), params);
      expect(authorRes.status).toBe(200);
      expect(prisma.post.delete).toHaveBeenCalledWith({ where: { id: "post-1" } });
      expect(revalidatePath).toHaveBeenCalledWith("/");

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "pr@ntusa.ntu.edu.tw", role: "editor", department: "公關部" },
      } as never);
      const prRes = await DELETE(new Request("http://localhost/api/posts/post-1", { method: "DELETE" }), params);
      expect(prRes.status).toBe(200);
    });
  });

  describe("PATCH review workflow", () => {
    it("returns 401 when unauthenticated and 404 when post is missing", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce(null);
      const unauth = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      }), params);
      expect(unauth.status).toBe(401);

      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "reviewer@ntusa.ntu.edu.tw", role: "reviewer", department: "公關部" },
      } as never);
      vi.mocked(prisma.post.findUnique).mockResolvedValueOnce(null);
      const notFound = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      }), params);
      expect(notFound.status).toBe(404);
    });

    it("forbids editors from reviewing post status", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "Author@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);

      const response = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      }), params);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ errorCode: "FORBIDDEN_REVIEW" });
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("rejects invalid statuses and rejections without a reason", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "reviewer@ntusa.ntu.edu.tw", role: "reviewer", department: "公關部" },
      } as never);

      const invalidStatus = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "PUBLISHED" }),
      }), params);
      expect(invalidStatus.status).toBe(400);
      expect(await invalidStatus.json()).toEqual({ errorCode: "INVALID_STATUS" });

      const missingReason = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", rejectReason: "   " }),
      }), params);
      expect(missingReason.status).toBe(400);
      expect(await missingReason.json()).toEqual({ errorCode: "REJECT_REASON_REQUIRED" });
    });

    it("approves or rejects posts and still succeeds if email notification fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: "reviewer@ntusa.ntu.edu.tw", role: "reviewer", department: "公關部" },
      } as never);
      sendEmail.mockRejectedValueOnce(new Error("smtp down"));

      const rejectRes = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", rejectReason: "格式不符" }),
      }), params);

      expect(rejectRes.status).toBe(200);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: {
          status: "REJECTED",
          content: "<p>Original body</p>",
          rejectReason: "格式不符",
        },
      });
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
        to: [existingPost.authorEmail],
      }));
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });
  });

  describe("PATCH edit workflow", () => {
    it("forbids users outside the author, department, and reviewer/admin roles", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "outsider@ntusa.ntu.edu.tw", role: "editor", department: "財務部" },
      } as never);

      const response = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Hijack", content: "<p>Text</p>" }),
      }), params);

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ errorCode: "FORBIDDEN_UPDATE" });
      expect(prisma.post.update).not.toHaveBeenCalled();
    });

    it("allows same-department members to edit, resets status to PENDING, and clears rejectReason", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "colleague@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);

      const response = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated Title", content: "<p>Updated body</p>", coverImage: null }),
      }), params);

      expect(response.status).toBe(200);
      expect(prisma.post.update).toHaveBeenCalledWith({
        where: { id: "post-1" },
        data: {
          title: "Updated Title",
          content: "<p>Updated body</p>",
          coverImage: null,
          status: "PENDING",
          rejectReason: null,
        },
      });
      expect(sendEmail).toHaveBeenCalledOnce();
      expect(revalidatePath).toHaveBeenCalledWith("/");
    });

    it("returns 400 BAD_REQUEST when neither status nor editable fields are provided", async () => {
      vi.mocked(getServerSession).mockResolvedValueOnce({
        user: { email: "Author@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
      } as never);

      const response = await PATCH(new Request("http://localhost/api/posts/post-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }), params);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ errorCode: "BAD_REQUEST" });
    });
  });
});
