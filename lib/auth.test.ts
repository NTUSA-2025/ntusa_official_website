import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authOptions } from "./auth";
import { getUserGroups } from "./google-admin";

vi.mock("./google-admin", () => ({
  getUserGroups: vi.fn(),
}));

const mockedGetUserGroups = vi.mocked(getUserGroups);

const jwtCallback = authOptions.callbacks?.jwt;
const sessionCallback = authOptions.callbacks?.session;

if (!jwtCallback || !sessionCallback) {
  throw new Error("Auth callbacks must be configured for these tests.");
}

function user(email: string): User {
  return {
    id: email,
    email,
    name: "Test User",
  };
}

function account(): Account {
  return {
    provider: "google",
    type: "oauth",
    providerAccountId: "google-account-id",
  };
}

async function buildTokenForGroups(groups: Array<{ email?: string | null; name?: string | null }>): Promise<JWT> {
  mockedGetUserGroups.mockResolvedValueOnce(groups);

  return jwtCallback({
    token: {},
    user: user("member@ntusa.ntu.edu.tw"),
    account: account(),
  } as Parameters<typeof jwtCallback>[0]);
}

describe("auth group mapping", () => {
  beforeEach(() => {
    mockedGetUserGroups.mockReset();
  });

  it("maps information department members to admins", async () => {
    const token = await buildTokenForGroups([{ email: "infor@ntusa.ntu.edu.tw" }]);

    expect(token.role).toBe("admin");
    expect(token.department).toBe("資訊部");
  });

  it("maps PR department members to reviewers", async () => {
    const token = await buildTokenForGroups([{ email: "pr-dept@ntusa.ntu.edu.tw" }]);

    expect(token.role).toBe("reviewer");
    expect(token.department).toBe("公關部");
  });

  it("maps known department groups to editors in that department", async () => {
    const token = await buildTokenForGroups([{ email: "academic@ntusa.ntu.edu.tw" }]);

    expect(token.role).toBe("editor");
    expect(token.department).toBe("學術部");
  });

  it("uses the default department for users without mapped groups", async () => {
    const token = await buildTokenForGroups([{ email: "unknown@ntusa.ntu.edu.tw", name: "Unknown" }]);

    expect(token.role).toBe("editor");
    expect(token.department).toBe("一般部門");
  });

  it("keeps information department admin role even when PR membership is also present", async () => {
    const token = await buildTokenForGroups([
      { email: "pr-dept@ntusa.ntu.edu.tw" },
      { email: "infor@ntusa.ntu.edu.tw" },
    ]);

    expect(token.role).toBe("admin");
    expect(token.department).toBe("資訊部");
  });

  it("copies mapped role and department into the session", async () => {
    const session = await sessionCallback({
      session: { user: { name: "Test User", email: "member@ntusa.ntu.edu.tw" }, expires: "" },
      token: { role: "reviewer", department: "公關部" },
    } as Parameters<typeof sessionCallback>[0]);

    expect(session.user.role).toBe("reviewer");
    expect(session.user.department).toBe("公關部");
  });
});
