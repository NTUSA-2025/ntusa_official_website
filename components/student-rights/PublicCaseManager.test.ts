import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createTranslator, NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import zh from "@/messages/zh-TW.json";
import PublicCaseManager, { type ManagedPublicCase } from "./PublicCaseManager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));

type ProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode };
const Provider = NextIntlClientProvider as ComponentType<ProviderProps>;

const caseRecord: ManagedPublicCase = {
  id: "case-1", number: 5, openedAt: "2026-09-05T12:00:00.000Z",
  createdAt: "2026-10-02T02:05:00.000Z", updatedAt: "2026-10-02T02:05:00.000Z",
  currentSituation: "已聯絡校方", publicSummary: "校園空間改善", isPublic: true,
  timelineEvents: [{
    id: "event-1", occurredAt: "2026-09-18T12:00:00.000Z", publicNote: "已聯絡校方", isPublic: true,
    createdAt: "2026-10-02T02:05:00.000Z", updatedAt: "2026-10-02T02:05:00.000Z",
  }],
};

describe("case management translations", () => {
  for (const [locale, messages] of [["en", en], ["zh-TW", zh]] as const) {
    const t = createTranslator({ locale, messages, namespace: "caseManagement" });
    const render = (record?: ManagedPublicCase) => renderToStaticMarkup(createElement(Provider, {
      locale, messages, timeZone: "Asia/Taipei", onError: (error) => { throw error; },
    }, createElement(PublicCaseManager, { caseRecord: record })));

    it(`renders the new case form in ${locale}`, () => {
      const markup = render();
      expect(markup).toContain(t("newTitle"));
      expect(markup).toContain(t("caseDate"));
      expect(markup).toContain(t("subject"));
      expect(markup).toContain(t("initialProgress"));
      expect(markup).toContain(t("createCase"));
      expect(markup).toContain(t("caseVisibility"));
      if (locale === "en") expect(markup).not.toMatch(/\p{Script=Han}/u);
    });

    it(`localizes the editor and dates in ${locale} while preserving case content`, () => {
      const markup = render(caseRecord);
      expect(markup).toContain(t("editTitle", { number: 5 }));
      expect(markup).toContain(t("saveCase"));
      expect(markup).toContain(t("progressVisibility"));
      expect(markup).toContain(t("progressCount", { count: 1 }));
      expect(markup).toContain(t("delete"));
      expect(markup).toContain(caseRecord.publicSummary);
      expect(markup).toContain(caseRecord.timelineEvents[0].publicNote);
      expect(markup).toContain(locale === "en" ? "September 18, 2026" : "2026年9月18日");
      expect(markup).toContain(locale === "en" ? "October 2, 2026" : "2026年10月2日");
      expect(markup).not.toContain(t("caseDateHelp"));
    });

    it(`renders usable notifications and confirmation messages in ${locale}`, () => {
      const reason = t("errors.PUBLIC_EVENT_REQUIRED");
      const message = t("notifications.deleteFailed", { reason });
      expect(message).toContain(reason);
      expect(message).not.toContain("PUBLIC_EVENT_REQUIRED");
      expect(t("deleteConfirm")).toContain(locale === "en" ? "cannot be undone" : "無法復原");
      expect(t("progressCount", { count: 2 })).toBe(locale === "en" ? "2 updates" : "2 筆");
    });
  }
});
