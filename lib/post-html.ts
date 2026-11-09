import sanitizeHtml from "sanitize-html";
import { hasLinkCredentials, isSafePostLinkHref } from "./post-link-url";

// Match the markup produced by the current Tiptap StarterKit and Image extensions.
// Keep this allowlist narrow: article HTML is rendered with dangerouslySetInnerHTML.
const postHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "strong", "em", "s", "strike",
    "blockquote", "ul", "ol", "li", "pre", "code", "hr", "img", "a",
  ],
  allowedAttributes: {
    ol: ["start"],
    img: ["src", "alt", "title"],
    a: ["href"],
  },
  allowedSchemes: ["http", "https"],
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.href && isSafePostLinkHref(attribs.href) ? attribs : {},
    }),
  },
  nonTextTags: [
    "script", "style", "textarea", "option", "xmp", "svg", "math",
    "iframe", "object", "embed", "template",
  ],
  nestingLimit: 50,
};

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, postHtmlOptions);
}

export function hasCredentialedPostLink(html: string): boolean {
  let found = false;
  sanitizeHtml(html, {
    ...postHtmlOptions,
    onOpenTag: (name, attribs) => {
      if (name === "a" && attribs.href && hasLinkCredentials(attribs.href)) found = true;
    },
  });
  return found;
}

export interface PostLinkDestination {
  href: string;
  hostname: string | null;
}

export function getPostLinkDestinations(html: string): PostLinkDestination[] {
  const destinations: PostLinkDestination[] = [];
  const seen = new Set<string>();
  sanitizeHtml(sanitizePostHtml(html), {
    ...postHtmlOptions,
    onOpenTag: (name, attribs) => {
      const href = attribs.href;
      if (name !== "a" || !href || seen.has(href)) return;
      try {
        const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(href);
        const hostname = isAbsolute ? new URL(href).hostname : null;
        seen.add(href);
        destinations.push({ href, hostname });
      } catch {
        // A malformed legacy URL should not break the review dashboard.
      }
    },
  });
  return destinations;
}
