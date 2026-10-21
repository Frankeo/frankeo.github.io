import assert from "node:assert/strict";
import test from "node:test";
import { extractPortfolioSections, fetchPublicGoogleDoc, getGoogleDocId } from "../lib/google-doc";

test("Google Docs links are validated and extracted from the config URL", () => {
  assert.equal(getGoogleDocId("https://docs.google.com/document/d/doc_123/edit?usp=sharing"), "doc_123");
  for (const url of ["not a url", "https://example.com/document/d/id", "https://docs.google.com/spreadsheets/d/id"]) {
    assert.throws(() => getGoogleDocId(url), /Google Docs/);
  }
});

test("public Google Docs export is fetched without credentials and sanitized", async () => {
  const calls: Array<{ url: string; cache?: RequestCache }> = [];
  const fakeFetch: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), cache: init?.cache });
    return new Response(
      '<html><head><script>bad()</script></head><body><h1>CV</h1><p onclick="bad()"><b>Public</b> &amp; safe</p><a href="javascript:bad()">link</a></body></html>',
    );
  };

  const html = await fetchPublicGoogleDoc(
    "https://docs.google.com/document/d/doc-id/edit?usp=sharing",
    fakeFetch,
  );

  assert.deepEqual(calls, [{
    url: "https://docs.google.com/document/d/doc-id/export?format=html",
    cache: "force-cache",
  }]);
  assert.equal(html, "<h1>CV</h1><p><b>Public</b> &amp; safe</p><a>link</a>");
});

test("Google Docs export errors explain the public sharing requirement", async () => {
  const fakeFetch: typeof fetch = async () => new Response("", { status: 403 });
  await assert.rejects(
    fetchPublicGoogleDoc("https://docs.google.com/document/d/doc-id/edit", fakeFetch),
    /sharing settings/,
  );
});

test("CV summary and technical skills are extracted by their document headings", () => {
  const sections = extractPortfolioSections(`
    <h1>PROFESSIONAL SUMMARY</h1>
    <p>Software engineering since 2013.</p>
    <p>Focused on cloud platforms and delivery.</p>
    <h1>TECHNICAL SKILLS</h1>
    <p>Cloud &amp; DevOps: AWS · Terraform · Kubernetes</p>
    <p>Development: React, TypeScript, .NET</p>
    <h1>PROFESSIONAL EXPERIENCE</h1>
    <h2>DevOps Engineer | Align Technology</h2>
    <p>October 2022 – Present</p>
    <p>Infrastructure &amp; CI/CD: AWS, Terraform and Kubernetes.</p>
    <p>Built reliable delivery pipelines.</p>
    <h1>PROFESSIONAL EXPERIENCE · CONTINUED</h1>
    <h2>.NET Developer | NEORIS / Dreyfus</h2>
    <p>2015 – February 2016</p>
    <p>Technologies: .NET Framework, Oracle and PL/SQL.</p>
    <h1>EDUCATION</h1>
    <h2>Studies in Systems Engineering</h2>
    <p>UTN – Facultad Regional Rosario | 2010 – 2015</p>
    <h1>CERTIFICATIONS &amp; ADDITIONAL TRAINING</h1>
    <p>AWS: Certified Cloud Practitioner.</p>
    <p>IBM: Object-Oriented Systems Modeling; DB2 Database Design.</p>
    <h1>LANGUAGES</h1>
    <p>English: fluent, full professional proficiency.</p>
  `);

  assert.deepEqual(sections, {
    summary: ["Software engineering since 2013.", "Focused on cloud platforms and delivery."],
    skillGroups: [
      { category: "Cloud & DevOps", skills: ["AWS", "Terraform", "Kubernetes"] },
      { category: "Development", skills: ["React", "TypeScript", ".NET"] },
    ],
    experience: [{
      role: "DevOps Engineer",
      organization: "Align Technology",
      period: "October 2022 – Present",
      highlights: ["Infrastructure & CI/CD: AWS, Terraform and Kubernetes.", "Built reliable delivery pipelines."],
    }, {
      role: ".NET Developer",
      organization: "NEORIS / Dreyfus",
      period: "2015 – February 2016",
      highlights: ["Technologies: .NET Framework, Oracle and PL/SQL."],
    }],
    education: [{
      qualification: "Studies in Systems Engineering",
      institution: "UTN – Facultad Regional Rosario",
      period: "2010 – 2015",
    }],
    certifications: [
      { provider: "AWS", items: ["Certified Cloud Practitioner."] },
      { provider: "IBM", items: ["Object-Oriented Systems Modeling", "DB2 Database Design."] },
    ],
    languages: [{ language: "English", proficiency: "fluent, full professional proficiency." }],
  });
});
