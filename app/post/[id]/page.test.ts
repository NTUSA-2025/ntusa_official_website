import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth/next";
import { notFound } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import zh from "@/messages/zh-TW.json";
import PostPage from "./page";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({ default: { post: { findUnique: vi.fn() } } }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(() => { throw new Error("NOT_FOUND"); }) }));
vi.mock("@/components/DeleteButton", () => ({ default: () => null }));

const post = {
  id: "post-1",
  title: "待審核公告",
  status: "PENDING",
  authorEmail: "author@ntusa.ntu.edu.tw",
  department: "學權部",
  content: "<p>公告內容</p>",
  coverImage: null,
  createdAt: new Date("2026-11-13T00:00:00Z"),
};
const params = { params: Promise.resolve({ id: post.id }) };

describe("post preview access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.post.findUnique).mockResolvedValue(post as never);
    const t = createTranslator({ locale: "zh-TW", messages: zh, namespace: "post" });
    vi.mocked(getTranslations).mockResolvedValue(t as Awaited<ReturnType<typeof getTranslations>>);
  });

  it("shows an unpublished post to a reviewer outside the author's department", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "reviewer@ntusa.ntu.edu.tw", role: "reviewer", department: "會本部" },
    } as Awaited<ReturnType<typeof getServerSession>>);

    const markup = renderToStaticMarkup(await PostPage(params));
    expect(markup).toContain(post.title);
    expect(markup).toContain("公告內容");
    expect(markup).toContain("尚未對外公開");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("does not expose an unpublished post to another department's editor", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { email: "editor@ntusa.ntu.edu.tw", role: "editor", department: "資訊部" },
    } as Awaited<ReturnType<typeof getServerSession>>);

    await expect(PostPage(params)).rejects.toThrow("NOT_FOUND");
  });
});
