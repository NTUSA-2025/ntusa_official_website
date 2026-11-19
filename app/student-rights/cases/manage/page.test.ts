import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth/next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "@/lib/prisma";
import en from "@/messages/en.json";
import zh from "@/messages/zh-TW.json";
import PublicCaseManagePage from "./page";
import PublicCaseNotFound from "./[id]/not-found";

vi.mock("next-intl/server", () => ({ getLocale: vi.fn(), getTranslations: vi.fn() }));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ default: { publicCase: { findMany: vi.fn() }, caseTag: { findMany: vi.fn() } } }));
vi.mock("@/components/student-rights/CaseTagManager", () => ({ default: () => "Manage tags UI" }));

describe("case management server pages", () => {
  for (const [locale, messages] of [["en", en], ["zh-TW", zh]] as const) {
    describe(locale, () => {
      const t = createTranslator({ locale, messages, namespace: "caseManagement" });
      beforeEach(() => {
        vi.mocked(getLocale).mockResolvedValue(locale);
        vi.mocked(getTranslations).mockResolvedValue(t as Awaited<ReturnType<typeof getTranslations>>);
        vi.mocked(prisma.publicCase.findMany).mockResolvedValue([]);
        vi.mocked(prisma.caseTag.findMany).mockResolvedValue([]);
        vi.mocked(getServerSession).mockResolvedValue(null);
      });

      it("translates the empty list", async () => {
        const markup = renderToStaticMarkup(await PublicCaseManagePage({ searchParams: Promise.resolve({}) }));
        expect(markup).toContain(t("title"));
        expect(markup).toContain(t("newCase"));
        expect(markup).toContain(t("emptyCases"));
        expect(markup).toContain(t("caseCount", { count: 0 }));
        expect(markup).toContain(t("filterByTag"));
        expect(markup).toContain(t("filterUnavailable"));
        if (locale === "en") expect(markup).not.toMatch(/\p{Script=Han}/u);
      });

      it("translates list dates and status without translating authored content", async () => {
        const cases = [{
          id: "case-1", number: 5, publicSummary: "校園空間改善", currentSituation: "已聯絡校方",
          openedAt: new Date("2026-09-05T12:00:00Z"), updatedAt: new Date("2026-10-02T02:05:00Z"),
          createdAt: new Date("2026-10-02T02:05:00Z"), createdBy: "test", updatedBy: "test", isPublic: false,
          timelineEvents: [], tags: [],
        }];
        vi.mocked(prisma.publicCase.findMany).mockResolvedValue(cases);
        const markup = renderToStaticMarkup(await PublicCaseManagePage({ searchParams: Promise.resolve({}) }));
        expect(markup).toContain(t("caseNumber", { number: 5 }));
        expect(markup).toContain(t("private"));
        expect(markup).toContain(t("caseCount", { count: 1 }));
        expect(markup).toContain(locale === "en" ? "September 5, 2026" : "2026年9月5日");
        expect(markup).toContain("校園空間改善");
      });

      it("translates missing cases and migration notices", async () => {
        expect(renderToStaticMarkup(await PublicCaseNotFound())).toContain(t("notFoundTitle"));
        vi.mocked(prisma.publicCase.findMany).mockRejectedValue({ code: "P2021" });
        const markup = renderToStaticMarkup(await PublicCaseManagePage({ searchParams: Promise.resolve({}) }));
        expect(markup).toContain(t("migrationPending"));
        expect(markup).not.toContain("npm run");
      });

      it("filters the management list by a selected tag", async () => {
        vi.mocked(prisma.caseTag.findMany).mockResolvedValue([{ id: "tag-1", name: "交通", nameKey: "交通", createdAt: new Date() }]);
        const markup = renderToStaticMarkup(await PublicCaseManagePage({ searchParams: Promise.resolve({ tag: "tag-1" }) }));
        expect(markup).toContain("交通");
        expect(prisma.publicCase.findMany).toHaveBeenCalledWith(expect.objectContaining({
          where: { tags: { some: { id: "tag-1" } } },
        }));
      });

      it("shows tag management for admins", async () => {
        vi.mocked(getServerSession).mockResolvedValue({ expires: "2099-01-01", user: { email: "admin@ntusa.ntu.edu.tw", role: "admin", department: "資訊部" } });
        const markup = renderToStaticMarkup(await PublicCaseManagePage({ searchParams: Promise.resolve({}) }));
        expect(markup).toContain("Manage tags UI");
      });
    });
  }
});
