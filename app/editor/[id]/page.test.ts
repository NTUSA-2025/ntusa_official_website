import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import prisma from "@/lib/prisma";
import EditPage from "./page";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("@/components/Editor", () => ({ default: () => null }));
vi.mock("@/lib/prisma", () => ({
  default: { post: { findUnique: vi.fn() } },
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
}));

const params = { params: Promise.resolve({ id: "post-1" }) };
const post = {
  id: "post-1",
  title: "測試文章",
  content: '<p onclick="alert(1)">Hello</p>',
  coverImage: null,
  status: "PENDING",
  authorEmail: "author@ntusa.ntu.edu.tw",
  department: "學術部",
};

describe("EditPage access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTranslations).mockResolvedValue(((key: string) => key) as never);
    vi.mocked(prisma.post.findUnique).mockResolvedValue(post as never);
  });

  it("redirects unauthenticated users to sign in", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    await expect(EditPage(params)).rejects.toThrow("REDIRECT:/api/auth/signin");
  });

  it("calls notFound when the post does not exist", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "author@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
    } as never);
    vi.mocked(prisma.post.findUnique).mockResolvedValueOnce(null);

    await expect(EditPage(params)).rejects.toThrow("NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("redirects users who are not the author, same department, or reviewer/admin", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "outsider@ntusa.ntu.edu.tw", role: "editor", department: "財務部" },
    } as never);

    await expect(EditPage(params)).rejects.toThrow("REDIRECT:/review");
  });

  it("renders editor for same-department members", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "colleague@ntusa.ntu.edu.tw", role: "editor", department: "學術部" },
    } as never);

    await expect(EditPage(params)).resolves.toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
