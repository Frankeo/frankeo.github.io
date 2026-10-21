import sanitizeHtml from "sanitize-html";

export function getGoogleDocId(documentUrl: string): string {
  let url: URL;
  try {
    url = new URL(documentUrl);
  } catch {
    throw new Error("Set a valid public Google Docs URL in document-config.json.");
  }

  const match = url.hostname === "docs.google.com"
    ? url.pathname.match(/^\/document\/d\/([a-zA-Z0-9_-]+)/)
    : null;
  if (!match) throw new Error("The configured URL must be a Google Docs document link.");
  return match[1];
}

export async function fetchPublicGoogleDoc(documentUrl: string, fetcher: typeof fetch = fetch) {
  const documentId = getGoogleDocId(documentUrl);
  const response = await fetcher(
    `https://docs.google.com/document/d/${encodeURIComponent(documentId)}/export?format=html`,
    { cache: "force-cache" },
  );
  if (!response.ok) {
    throw new Error(`Could not read the public Google Doc (${response.status}). Check its sharing settings.`);
  }

  const html = await response.text();
  if (html.length > 10_000_000) throw new Error("The Google Doc export is too large to publish (10 MB limit).");

  return sanitizeHtml(html, {
    allowedTags: [
      "a", "b", "blockquote", "br", "caption", "code", "dd", "div", "dl", "dt", "em",
      "h1", "h2", "h3", "h4", "hr", "i", "li", "ol", "p", "pre", "s", "span", "strong",
      "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul",
    ],
    allowedAttributes: { a: ["href"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
  });
}