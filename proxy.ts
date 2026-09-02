import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE, locales } from "@/i18n/config";
import { LOCALE_COOKIE_MAX_AGE_SECONDS } from "@/lib/locale-cookie";

function resolveLocale(request: NextRequest): string {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    const preferredLocales = acceptLanguage
      .split(",")
      .map((part) => part.split(";")[0].trim());

    const directMatch = preferredLocales.find((p) =>
      (locales as readonly string[]).includes(p)
    );
    if (directMatch) return directMatch;

    const langOnlyMatch = preferredLocales
      .map((p) => p.split("-")[0])
      .find((p) => (locales as readonly string[]).includes(p));
    if (langOnlyMatch) return langOnlyMatch;
  }

  return defaultLocale;
}

export default function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const locale = resolveLocale(request);
  const isHttps =
    request.nextUrl.protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const secure = process.env.NODE_ENV === "production" || isHttps;

  response.cookies.set({
    name: LOCALE_COOKIE,
    value: locale,
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE_SECONDS,
    sameSite: "strict",
    secure,
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
