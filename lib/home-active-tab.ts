export const HOME_SECTION_IDS = ["home", "about", "rights", "forms", "data"] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

/**
 * Maps a URL hash fragment (with or without "#") to the home single-page tab id.
 * Unknown fragments fall back to "home".
 */
export function tabFromHashFragment(fragment: string): HomeSectionId {
  // Normalize: remove hash, remove trailing slash, trim, and lowercase
  const id = fragment.replace(/^#/, "").replace(/\/$/, "").trim().toLowerCase() || "home";
  return (HOME_SECTION_IDS as readonly string[]).includes(id)
    ? (id as HomeSectionId)
    : "home";
}
