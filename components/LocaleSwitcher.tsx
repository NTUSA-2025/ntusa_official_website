"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, type Locale } from "@/i18n/config";
import { serializeLocaleCookie } from "@/lib/locale-cookie";

type Variant = "desktop" | "drawer";

export default function LocaleSwitcher({
  variant = "desktop",
  onSwitch,
}: {
  variant?: Variant;
  onSwitch?: () => void;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    const secure = typeof window !== "undefined" && window.location.protocol === "https:";
    Reflect.set(
      window.document,
      "cookie",
      serializeLocaleCookie(next, secure),
    );
    onSwitch?.();
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div
      className={`locale-switcher locale-switcher--${variant}`}
      role="group"
      aria-label={t("switchToEn")}
    >
      {locales.map((target) => {
        const isActive = target === locale;
        const label = target === "zh-TW" ? "中" : "EN";
        const ariaLabel = target === "zh-TW" ? t("switchToZh") : t("switchToEn");
        return (
          <button
            key={target}
            type="button"
            onClick={() => switchTo(target)}
            disabled={isPending || isActive}
            aria-pressed={isActive}
            aria-label={ariaLabel}
            className={`locale-switcher__option ${isActive ? "is-active" : ""}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
