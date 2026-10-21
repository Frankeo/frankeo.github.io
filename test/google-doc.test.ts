import assert from "node:assert/strict";
import test from "node:test";
import { fetchGitHubPortfolio, fetchLatestGitHubProjects, fetchLatestRepositories, getTopRepositories, type GitHubRepository } from "../lib/github";
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

test("GitHub projects rank public repositories by stars and omit forks and archives", () => {
  const repository = (name: string, stars: number, fork = false, archived = false): GitHubRepository => ({
    name,
    html_url: `https://github.com/Frankeo/${name}`,
    description: null,
    language: "TypeScript",
    stargazers_count: stars,
    forks_count: 0,
    homepage: null,
    fork,
    archived,
    pushed_at: "2026-01-01T00:00:00Z",
  });
  const projects = getTopRepositories([
    repository("old-fork", 100, true),
    repository("archived", 90, false, true),
    repository("one", 4),
    repository("two", 3),
    repository("three", 2),
    repository("four", 1),
    repository("five", 0),
  ]);
  assert.deepEqual(projects.map((project) => project.name), ["one", "two", "three", "four"]);
});

test("GitHub portfolio loads the real profile and repository list", async () => {
  const urls: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/users/Frankeo")) {
      return Response.json({
        name: "Francisco Moreno",
        login: "Frankeo",
        avatar_url: "https://avatars.githubusercontent.com/u/123?v=4",
        html_url: "https://github.com/Frankeo",
        bio: null,
        location: "Barcelona",
      });
    }
    return Response.json([]);
  };

  const portfolio = await fetchGitHubPortfolio("Frankeo", fakeFetch);
  assert.equal(portfolio.profile.name, "Francisco Moreno");
  assert.deepEqual(portfolio.projects, []);
  assert.ok(urls.some((url) => url.includes("/users/Frankeo/repos?type=owner")));
});

test("GitHub project ranking refreshes changed star counts on each request", async () => {
  const repo = (name: string, stars: number): GitHubRepository => ({
    name,
    html_url: `https://github.com/Frankeo/${name}`,
    description: null,
    language: "TypeScript",
    stargazers_count: stars,
    forks_count: 0,
    homepage: null,
    fork: false,
    archived: false,
    pushed_at: "2026-01-01T00:00:00Z",
  });
  let refreshed = false;
  const fakeFetch: typeof fetch = async (_input, init) => {
    assert.equal(init?.cache, "no-store");
    return Response.json(refreshed
      ? [repo("changed-leader", 21), repo("old-leader", 2)]
      : [repo("old-leader", 20), repo("changed-leader", 1)]);
  };

  const first = await fetchLatestGitHubProjects("Frankeo", fakeFetch);
  refreshed = true;
  const second = await fetchLatestGitHubProjects("Frankeo", fakeFetch);
  assert.equal(first[0].name, "old-leader");
  assert.equal(second[0].name, "changed-leader");
});

test("organization projects come from the public organization endpoint", async () => {
  let requestUrl = "";
  const fakeFetch: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    assert.equal(init?.cache, "no-store");
    return Response.json([]);
  };

  await fetchLatestRepositories("on-the-edge-cloud", "organization", fakeFetch);
  assert.equal(
    requestUrl,
    "https://api.github.com/orgs/on-the-edge-cloud/repos?type=public&sort=updated&per_page=100",
  );
});