import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { POST, GET } from "./route";
import { PATCH } from "./[id]/route";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  default: { post: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class { emails = { send: vi.fn().mockResolvedValue({}) }; },
}));

const session = {
  user: { email: "editor@ntusa.ntu.edu.tw", name: "Editor", department: "資訊部", role: "admin" },
};
const existingPost = {
  id: "post-1", title: "Existing", content: '<p onclick="alert(1)">Old</p>',
  authorEmail: session.user.email, department: session.user.department,
};

describe("post API HTML cleaning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(session as Awaited<ReturnType<typeof getServerSession>>);
    vi.mocked(prisma.post.create).mockResolvedValue(existingPost as never);
    vi.mocked(prisma.post.findUnique).mockResolvedValue(existingPost as never);
    vi.mocked(prisma.post.update).mockResolvedValue(existingPost as never);
  });

  it("cleans a modified create request before storing it", async () => {
    const response = await POST(new Request("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "New", content: '<p onmouseover="alert(1)">Hello</p><script>alert(1)</script><img src="javascript:alert(1)" onerror="alert(1)">' }),
    }));
    expect(response.status).toBe(201);
    expect(vi.mocked(prisma.post.create).mock.calls[0][0].data.content).toBe("<p>Hello</p><img />");
  });

  it("rejects a create request whose only content is a script", async () => {
    const response = await POST(new Request("http://localhost/api/posts", {
      method: "POST",
      body: JSON.stringify({ title: "New", content: "<script>alert(1)</script>" }),
    }));
    expect(response.status).toBe(400);
    expect(prisma.post.create).not.toHaveBeenCalled();
  });

  it("cleans an edited post before storing it", async () => {
    const response = await PATCH(new Request("http://localhost/api/posts/post-1", {
      method: "PATCH",
      body: JSON.stringify({ content: '<h2>Updated</h2><img src="data:image/svg+xml;base64,PHN2Zz4=" onerror="alert(1)">' }),
    }), { params: Promise.resolve({ id: "post-1" }) });
    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.post.update).mock.calls[0][0].data.content).toBe("<h2>Updated</h2><img />");
  });

  it("cleans legacy content when a reviewer approves it", async () => {
    const response = await PATCH(new Request("http://localhost/api/posts/post-1", {
      method: "PATCH",
      body: JSON.stringify({ status: "APPROVED" }),
    }), { params: Promise.resolve({ id: "post-1" }) });
    expect(response.status).toBe(200);
    expect(vi.mocked(prisma.post.update).mock.calls[0][0].data.content).toBe("<p>Old</p>");
  });

  it("returns cleaned content from the public API for existing rows", async () => {
    vi.mocked(prisma.post.findMany).mockResolvedValue([existingPost] as never);
    const response = await GET();
    expect((await response.json())[0].content).toBe("<p>Old</p>");
  });
});
