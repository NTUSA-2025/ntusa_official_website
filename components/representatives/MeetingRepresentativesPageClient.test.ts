import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import zhTW from "@/messages/zh-TW.json";
import type { UniversityMeeting } from "@/lib/university-meeting-representatives";
import MeetingRepresentativesPageClient from "./MeetingRepresentativesPageClient";

type TestIntlProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & {
  children?: ReactNode;
};

const TestIntlProvider = NextIntlClientProvider as ComponentType<TestIntlProviderProps>;

function renderMeeting(overrides: Partial<UniversityMeeting> = {}) {
  const meeting: UniversityMeeting = {
    id: "test-meeting",
    name: "測試會議",
    representatives: [],
    ...overrides,
  };

  return renderToStaticMarkup(
    createElement(
      TestIntlProvider,
      { locale: "zh-TW", messages: zhTW, timeZone: "Asia/Taipei" },
      createElement(MeetingRepresentativesPageClient, { meetings: [meeting], embedded: true }),
    ),
  );
}

describe("MeetingRepresentativesPageClient", () => {
  it("renders unavailable resources as aligned, non-clickable text", () => {
    const markup = renderMeeting();

    expect(markup).toContain("查看會議紀錄（暫無連結）");
    expect(markup).toContain("查看相關法規或設置辦法（暫無連結）");
    expect(markup.match(/representatives-text-link-unavailable/g)).toHaveLength(2);
    expect(markup).not.toContain('href="#"');
    expect(markup).not.toMatch(/<a(?:\s|>)/);
  });

  it("renders available resources as external links", () => {
    const markup = renderMeeting({
      minutesUrl: "https://example.com/minutes",
      regulationUrl: "https://example.com/regulation",
    });

    expect(markup).toContain('href="https://example.com/minutes"');
    expect(markup).toContain('href="https://example.com/regulation"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("查看會議紀錄 ↗");
    expect(markup).toContain("查看相關法規或設置辦法 ↗");
    expect(markup).not.toContain("representatives-text-link-unavailable");
  });
});
