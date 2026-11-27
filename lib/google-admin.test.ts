import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listGroups } = vi.hoisted(() => ({ listGroups: vi.fn() }));

vi.mock("googleapis", () => ({
  google: {
    auth: { JWT: class {} },
    admin: () => ({ groups: { list: listGroups } }),
  },
}));

describe("getUserGroups", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("returns empty array when Google Admin credentials are not configured", async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    delete process.env.GOOGLE_PRIVATE_KEY;
    delete process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { getUserGroups } = await import("./google-admin");
    await expect(getUserGroups("member@ntusa.ntu.edu.tw")).resolves.toEqual([]);
    expect(listGroups).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledOnce();
  });

  it("fetches groups from Google Admin Directory API when configured", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\\nKEY\\n-----END PRIVATE KEY-----";
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL = "admin@ntusa.ntu.edu.tw";
    listGroups.mockResolvedValueOnce({ data: { groups: [{ email: "infor@ntusa.ntu.edu.tw" }] } });

    const { getUserGroups } = await import("./google-admin");
    await expect(getUserGroups("member@ntusa.ntu.edu.tw")).resolves.toEqual([{ email: "infor@ntusa.ntu.edu.tw" }]);
    expect(listGroups).toHaveBeenCalledWith({ userKey: "member@ntusa.ntu.edu.tw" });
  });

  it("returns empty array when Directory API call fails", async () => {
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL = "sa@example.iam.gserviceaccount.com";
    process.env.GOOGLE_PRIVATE_KEY = "key";
    process.env.GOOGLE_WORKSPACE_ADMIN_EMAIL = "admin@ntusa.ntu.edu.tw";
    vi.spyOn(console, "error").mockImplementation(() => {});
    listGroups.mockRejectedValueOnce(new Error("permission denied"));

    const { getUserGroups } = await import("./google-admin");
    await expect(getUserGroups("member@ntusa.ntu.edu.tw")).resolves.toEqual([]);
  });
});
