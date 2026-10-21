import sanitizeHtml from "sanitize-html";
import { load } from "cheerio";

export interface SkillGroup {
  category: string;
  skills: string[];
}

export interface PortfolioSections {
  summary: string[];
  skillGroups: SkillGroup[];
  experience: ExperienceItem[];
}

export interface ExperienceItem {
  role: string;
  organization: string;
  period: string;
  highlights: string[];
}

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

export function extractPortfolioSections(html: string): PortfolioSections {
  const $ = load(html);
  const summary: string[] = [];
  const skillGroups: SkillGroup[] = [];
  const experience: ExperienceItem[] = [];
  let activeSection: "summary" | "skills" | "experience" | null = null;
  let currentJob: ExperienceItem | null = null;

  $("body").children().each((_, element) => {
    const node = $(element);
    const text = node.text().replace(/\s+/g, " ").trim();
    if (!text) return;

    if (node.is("h1, h2, h3, h4")) {
      const heading = text.toUpperCase().replace(/[:：]+$/, "");
      if (node.is("h1")) {
        activeSection = heading === "PROFESSIONAL SUMMARY"
          ? "summary"
          : heading === "TECHNICAL SKILLS"
            ? "skills"
            : heading.startsWith("PROFESSIONAL EXPERIENCE")
              ? "experience"
              : null;
        if (activeSection !== "experience") currentJob = null;
      } else if (activeSection === "experience") {
        const [role, ...organization] = text.split(/\s+\|\s+/);
        currentJob = { role: role.trim(), organization: organization.join(" | ").trim(), period: "", highlights: [] };
        experience.push(currentJob);
      }
      return;
    }

    if (activeSection === "summary") {
      summary.push(text);
    } else if (activeSection === "skills") {
      const separator = text.indexOf(":");
      const category = separator > 0 ? text.slice(0, separator).trim() : "Skills";
      const value = separator > 0 ? text.slice(separator + 1) : text;
      const skills = value.split(/[·•,;|]+/).map((skill) => skill.trim()).filter(Boolean);
      if (skills.length) skillGroups.push({ category, skills });
    } else if (activeSection === "experience" && currentJob) {
      const isPeriod = /^(?:[A-Za-z]+\s+)?\d{4}\s*[–—-]\s*(?:present|(?:[A-Za-z]+\s+)?\d{4})$/i.test(text);
      if (isPeriod && !currentJob.period) currentJob.period = text;
      else currentJob.highlights.push(text);
    }
  });

  return { summary, skillGroups, experience };
}