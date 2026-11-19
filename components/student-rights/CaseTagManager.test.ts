import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import zh from "@/messages/zh-TW.json";
import CaseTagManager from "./CaseTagManager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

type ProviderProps = Omit<ComponentProps<typeof NextIntlClientProvider>, "children"> & { children?: ReactNode };
const Provider = NextIntlClientProvider as ComponentType<ProviderProps>;

function render(tags: { id: string; name: string }[], disabled = false) {
  return renderToStaticMarkup(createElement(Provider, {
    locale: "zh-TW", messages: zh, timeZone: "Asia/Taipei", onError: (error) => { throw error; },
  }, createElement(CaseTagManager, { tags, disabled })));
}

describe("case tag management", () => {
  it("shows a create form before any tags exist", () => {
    const markup = render([]);
    expect(markup).toContain("管理標籤");
    expect(markup).toContain('id="case-tag-name"');
    expect(markup).toContain("建立標籤");
  });

  it("offers renaming for existing tags", () => {
    const markup = render([{ id: "tag-1", name: "交通" }]);
    expect(markup).toContain("交通");
    expect(markup).toContain("重新命名");
  });
});
