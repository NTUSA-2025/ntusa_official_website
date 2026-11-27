import { beforeEach, describe, expect, it, vi } from "vitest";
import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import PublicCaseManageLayout from "./layout";

vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

describe("PublicCaseManageLayout access control", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated users to sign in", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    await expect(PublicCaseManageLayout({ children: "secret" })).rejects.toThrow(
      "REDIRECT:/api/auth/signin?callbackUrl=/student-rights/cases/manage",
    );
  });

  it("redirects users outside student-rights and information departments to /", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "pr@ntusa.ntu.edu.tw", role: "reviewer", department: "公關部" },
    } as never);

    await expect(PublicCaseManageLayout({ children: "secret" })).rejects.toThrow("REDIRECT:/");
  });

  it("renders children for student-rights and information department users", async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: "rights@ntusa.ntu.edu.tw", role: "editor", department: "學權部" },
    } as never);

    await expect(PublicCaseManageLayout({ children: "allowed" })).resolves.toBe("allowed");
    expect(redirect).not.toHaveBeenCalled();
  });
});
