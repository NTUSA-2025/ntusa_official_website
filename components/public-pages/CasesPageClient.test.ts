import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import zh from "@/messages/zh-TW.json";
import type { HomePublicCase } from "@/lib/get-cached-public-cases";
import CasesPageClient from "./CasesPageClient";

type ProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode };
const Provider = NextIntlClientProvider as ComponentType<ProviderProps>;

function render(publicCases: HomePublicCase[]) {
  return renderToStaticMarkup(createElement(Provider, {
    locale: "zh-TW", messages: zh, timeZone: "Asia/Taipei", onError: (error) => { throw error; },
  }, createElement(CasesPageClient, { publicCases })));
}

describe("public case tag filter", () => {
  it("keeps the filter visible before any tags exist", () => {
    const markup = render([]);
    expect(markup).toContain("依標籤篩選案件");
    expect(markup).toContain("目前沒有可篩選的標籤。");
    expect(markup).toContain('id="public-case-tag"');
  });

  it("shows assigned tags and filter options", () => {
    const markup = render([{
      id: "case-1", number: 1, openedAt: "2026-11-01T12:00:00.000Z", currentSituation: "處理中",
      publicSummary: "案件主旨", updatedAt: "2026-11-01T12:00:00.000Z",
      tags: [{ id: "tag-1", name: "交通" }], timelineEvents: [],
    }]);
    expect(markup).toContain('<option value="tag-1">交通</option>');
    expect(markup).toContain('class="case-tag">交通</span>');
  });
});
