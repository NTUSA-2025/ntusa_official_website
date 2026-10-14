import sanitizeHtml from "sanitize-html";

// Match the markup produced by the current Tiptap StarterKit and Image extensions.
// Keep this allowlist narrow: article HTML is rendered with dangerouslySetInnerHTML.
const postHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "h1", "h2", "h3", "strong", "em", "s", "strike",
    "blockquote", "ul", "ol", "li", "pre", "code", "hr", "img",
  ],
  allowedAttributes: {
    ol: ["start"],
    img: ["src", "alt", "title"],
  },
  allowedSchemes: ["http", "https"],
  allowProtocolRelative: false,
  nonTextTags: [
    "script", "style", "textarea", "option", "xmp", "svg", "math",
    "iframe", "object", "embed", "template",
  ],
  nestingLimit: 50,
};

export function sanitizePostHtml(html: string): string {
  return sanitizeHtml(html, postHtmlOptions);
}
