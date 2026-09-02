import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function serializeLocaleCookie(locale: Locale, secure: boolean = true) {
  const secureAttribute = secure ? "; Secure" : "";

  return `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Strict${secureAttribute}`;
}

