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

export function parsePostLinkInput(input: string):
  | { href: string; error?: never }
  | { href?: never; error: "invalid" | "credentials" } {
  const value = input.trim();
  if (!value || /^(?:\/\/|\\\\)/.test(value)) return { error: "invalid" };

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(value);
  const hasHostPort = /^[^/:\s]+:\d+(?:[/?#]|$)/.test(value);
  const candidate = hasScheme && !hasHostPort ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return { error: "invalid" };
    if (hasLinkCredentials(candidate)) return { error: "credentials" };
    return { href: url.href };
  } catch {
    return { error: "invalid" };
  }
}
