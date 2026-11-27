import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Account, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { authOptions, isReviewerUser } from "./auth";
import { getUserGroups } from "./google-admin";

vi.mock("./google-admin", () => ({
  getUserGroups: vi.fn(),
}));

const mockedGetUserGroups = vi.mocked(getUserGroups);

const configuredJwtCallback = authOptions.callbacks?.jwt;
const configuredSessionCallback = authOptions.callbacks?.session;
const configuredSignInCallback = authOptions.callbacks?.signIn;
const configuredRedirectCallback = authOptions.callbacks?.redirect;

if (!configuredJwtCallback || !configuredSessionCallback || !configuredSignInCallback || !configuredRedirectCallback) {
  throw new Error("Auth callbacks must be configured for these tests.");
}

const jwtCallback: NonNullable<typeof configuredJwtCallback> = configuredJwtCallback;
const sessionCallback: NonNullable<typeof configuredSessionCallback> = configuredSessionCallback;
const signInCallback: NonNullable<typeof configuredSignInCallback> = configuredSignInCallback;
const redirectCallback: NonNullable<typeof configuredRedirectCallback> = configuredRedirectCallback;

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

async function buildTokenForGroups(
  groups: Array<{ email?: string | null; name?: string | null }>,
  userEmail = "member@ntusa.ntu.edu.tw",
): Promise<JWT> {
  mockedGetUserGroups.mockResolvedValueOnce(groups);

  return jwtCallback({
    token: {},
    user: user(userEmail),
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

  it("maps president-office group (president@ntusa.ntu.edu.tw) members to reviewer role and 會本部", async () => {
    const token = await buildTokenForGroups([{ email: "president@ntusa.ntu.edu.tw" }]);

    expect(token.role).toBe("reviewer");
    expect(token.department).toBe("會本部");
  });

  it("maps direct president@ntusa.ntu.edu.tw login to reviewer role and 會本部", async () => {
    const token = await buildTokenForGroups([], "president@ntusa.ntu.edu.tw");

    expect(token.role).toBe("reviewer");
    expect(token.department).toBe("會本部");
  });

  it("does not hardcode sun.thuan.tiat@ntusa.ntu.edu.tw as reviewer when without groups", async () => {
    const token = await buildTokenForGroups([], "sun.thuan.tiat@ntusa.ntu.edu.tw");

    expect(token.role).toBe("editor");
    expect(token.department).toBe("一般部門");
  });

  it("grants reviewer to sun.thuan.tiat@ntusa.ntu.edu.tw when in president@ntusa.ntu.edu.tw group", async () => {
    const token = await buildTokenForGroups(
      [{ email: "president@ntusa.ntu.edu.tw" }],
      "sun.thuan.tiat@ntusa.ntu.edu.tw",
    );

    expect(token.role).toBe("reviewer");
    expect(token.department).toBe("會本部");
  });

  it("copies mapped role and department into the session", async () => {
    const session = await sessionCallback({
      session: { user: { name: "Test User", email: "member@ntusa.ntu.edu.tw" }, expires: "" },
      token: { role: "reviewer", department: "公關部" },
    } as Parameters<typeof sessionCallback>[0]);

    expect(session.user && "role" in session.user ? session.user.role : undefined).toBe("reviewer");
    expect(session.user && "department" in session.user ? session.user.department : undefined).toBe("公關部");
  });

  it("falls back safely when fetching user groups fails and preserves token on refresh", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockedGetUserGroups.mockRejectedValueOnce(new Error("directory api failure"));

    const token = await jwtCallback({
      token: {},
      user: user("member@ntusa.ntu.edu.tw"),
      account: account(),
    } as Parameters<typeof jwtCallback>[0]);

    expect(token.role).toBe("editor");
    expect(token.department).toBe("一般部門");

    const refreshed = await jwtCallback({
      token: { role: "admin", department: "資訊部" },
    } as Parameters<typeof jwtCallback>[0]);

    expect(refreshed.role).toBe("admin");
    expect(refreshed.department).toBe("資訊部");
    expect(mockedGetUserGroups).toHaveBeenCalledTimes(1);
    vi.restoreAllMocks();
  });
});

describe("auth signIn, redirect, and reviewer checks", () => {
  const originalReviewerEmails = process.env.REVIEWER_EMAILS;

  afterEach(() => {
    if (originalReviewerEmails === undefined) {
      delete process.env.REVIEWER_EMAILS;
    } else {
      process.env.REVIEWER_EMAILS = originalReviewerEmails;
    }
  });

  it("only allows @ntusa.ntu.edu.tw accounts to sign in", async () => {
    await expect(signInCallback({ user: user("member@ntusa.ntu.edu.tw"), account: account() })).resolves.toBe(true);
    await expect(signInCallback({ user: user("student@ntu.edu.tw"), account: account() })).resolves.toBe(false);
    await expect(signInCallback({ user: user("external@gmail.com"), account: account() })).resolves.toBe(false);
    await expect(signInCallback({ user: { id: "no-email" } as User, account: account() })).resolves.toBe(false);
  });

  it("validates redirect URLs and blocks external open redirects", async () => {
    const baseUrl = "https://ntusa.ntu.edu.tw";
    await expect(redirectCallback({ url: "/editor", baseUrl })).resolves.toBe("https://ntusa.ntu.edu.tw/editor");
    await expect(redirectCallback({ url: "https://ntusa.ntu.edu.tw/review", baseUrl })).resolves.toBe("https://ntusa.ntu.edu.tw/review");
    await expect(redirectCallback({ url: "http://ntusa.ntu.edu.tw/review", baseUrl })).resolves.toBe("https://ntusa.ntu.edu.tw/review");
    await expect(redirectCallback({ url: "https://evil.example/phish", baseUrl })).resolves.toBe(baseUrl);
  });

  it("matches REVIEWER_EMAILS case-insensitively and ignores empty values", () => {
    process.env.REVIEWER_EMAILS = " Alice@ntusa.ntu.edu.tw , bob@ntusa.ntu.edu.tw ";
    expect(isReviewerUser("alice@ntusa.ntu.edu.tw")).toBe(true);
    expect(isReviewerUser("president@ntusa.ntu.edu.tw")).toBe(true);
    expect(isReviewerUser("other@ntusa.ntu.edu.tw")).toBe(false);
    expect(isReviewerUser(null)).toBe(false);
  });
});
