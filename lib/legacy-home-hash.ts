const LEGACY_HOME_HASH_PATHS = {
  home: "/",
  about: "/about",
  announcements: "/announcements",
  cases: "/cases",
  forms: "/forms",
  data: "/data",
} as const;

export function pathFromLegacyHomeHash(fragment: string): string | null {
  const id = fragment.replace(/^#/, "").replace(/\/$/, "").trim().toLowerCase();
  return LEGACY_HOME_HASH_PATHS[id as keyof typeof LEGACY_HOME_HASH_PATHS] ?? null;
}
