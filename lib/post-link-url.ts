const POST_LINK_BASE_URL = "https://ntusa.ntu.edu.tw";

export function hasLinkCredentials(href: string): boolean {
  try {
    const url = new URL(href, POST_LINK_BASE_URL);
    return Boolean(url.username || url.password) || /^(?:[a-z][a-z\d+.-]*:)?\/\/[^/?#]*@/i.test(href);
  } catch {
    return false;
  }
}

export function isSafePostLinkHref(href: string): boolean {
  if (!href || /^(?:\/\/|\\\\)/.test(href) || hasLinkCredentials(href)) return false;
  try {
    const url = new URL(href, POST_LINK_BASE_URL);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
