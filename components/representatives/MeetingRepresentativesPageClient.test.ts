import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";
import zhTW from "@/messages/zh-TW.json";
import type { UniversityMeeting } from "@/lib/university-meeting-representatives";
import MeetingRepresentativesPageClient from "./MeetingRepresentativesPageClient";

function renderMeeting(minutesUrl?: string) {
  const meeting: UniversityMeeting = {
    id: "test-meeting",
    name: "測試會議",
    representatives: [],
    minutesUrl,
  };

  return renderToStaticMarkup(
    createElement(
      NextIntlClientProvider,
      { locale: "zh-TW", messages: zhTW, timeZone: "Asia/Taipei" },
      createElement(MeetingRepresentativesPageClient, { meetings: [meeting], embedded: true }),
    ),
  );
}

describe("MeetingRepresentativesPageClient", () => {
  it("renders unavailable meeting minutes as non-clickable text", () => {
    const markup = renderMeeting();

    expect(markup).toContain("查看會議紀錄（暫無連結）");
    expect(markup).toContain("representatives-text-link-unavailable");
    expect(markup).not.toContain('href="#"');
    expect(markup).not.toMatch(/<a(?:\s|>)/);
  });

  it("renders available meeting minutes as an external link", () => {
    const markup = renderMeeting("https://example.com/minutes");

    expect(markup).toContain('href="https://example.com/minutes"');
    expect(markup).toContain('target="_blank"');
    expect(markup).toContain("查看會議紀錄 ↗");
    expect(markup).not.toContain("representatives-text-link-unavailable");
  });
});
