import config from "../document-config.json";
import { fetchGitHubOrganizationProjects, fetchGitHubPortfolio } from "../lib/github";
import { extractPortfolioSections, fetchPublicGoogleDoc } from "../lib/google-doc";
import { ArrowUpRight, Code2, MapPin } from "lucide-react";
import Image from "next/image";
import GitHubProjects from "./GitHubProjects";
import PdfButton from "./PdfButton";

export const metadata = {
  title: `${config.title} | ${config.githubUsername}`,
};

export default async function HomePage() {
  const [{ profile, projects }, companyProjects, documentHtml] = await Promise.all([
    fetchGitHubPortfolio(config.githubUsername),
    fetchGitHubOrganizationProjects(config.githubOrganization),
    fetchPublicGoogleDoc(config.googleDocUrl),
  ]);
  const { summary, skillGroups } = extractPortfolioSections(documentHtml);
  const name = profile.name || profile.login;
  const linkedIn = config.linkedinUrl;

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={`${name}, inicio`}>
          FM<span> / </span>PORTFOLIO
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#projects">Projects</a>
          <a href="#about">About</a>
          <a className="social-shortcut" href={profile.html_url} target="_blank" rel="noreferrer">
            GitHub
          </a>
          <a className="social-shortcut" href={linkedIn} target="_blank" rel="noreferrer">
            LinkedIn
          </a>
          <PdfButton />
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> DevOps engineer <span>/</span> Barcelona, Spain</p>
            <h1 id="hero-title">I build the systems <em>behind</em> great software.</h1>
            <p className="hero-intro">
              {profile.bio || "Engineering reliable cloud platforms, delivery pipelines and developer experiences."}
            </p>
            <div className="hero-actions">
              <a className="action-link action-dark" href="#projects">Explore selected work <ArrowUpRight size={17} /></a>
              <a className="action-link action-light" href={linkedIn} target="_blank" rel="noreferrer">
                Let’s connect <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="hero-footnote"><span>01</span> PLATFORM ENGINEERING · CLOUD · CI/CD</div>
          </div>

          <figure className="portrait-frame">
            <div className="portrait-image">
              <Image
                src={profile.avatar_url}
                alt={`Portrait of ${name}`}
                width={460}
                height={460}
                priority
                unoptimized
                sizes="(max-width: 700px) 82vw, 38vw"
              />
            </div>
            <figcaption><MapPin size={15} aria-hidden="true" /> Barcelona, Spain <span>·</span> Building since 2013</figcaption>
            <span className="portrait-index" aria-hidden="true">FM</span>
          </figure>
          <a className="scroll-cue" href="#projects">Scroll to selected work <span>↓</span></a>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-copy">
            <p className="section-kicker"><span>01</span> A little about me</p>
            <h2 id="about-title">Engineering with a view beyond the code<span className="accent-period">.</span></h2>
            <div className="summary-copy">
              {summary.map((paragraph, index) => (
                <p className={index === 0 ? "summary-lead" : "summary-detail"} key={`${index}-${paragraph}`}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className="skills-panel">
            <p className="section-kicker"><span>02</span> Technical toolkit</p>
            {skillGroups.map((group) => (
              <div className="skill-group" key={group.category}>
                <h3>{group.category}</h3>
                <ul className="skill-chips">
                  {group.skills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <GitHubProjects groups={[
          {
            key: "personal",
            owner: config.githubUsername,
            accountType: "user",
            label: "Personal projects",
            title: "Francisco Moreno",
            profileUrl: profile.html_url,
            initialProjects: projects,
          },
          {
            key: "company",
            owner: config.githubOrganization,
            accountType: "organization",
            label: "Company projects",
            title: "On The Edge Cloud",
            profileUrl: `https://github.com/${config.githubOrganization}`,
            initialProjects: companyProjects,
          },
        ]} />

        <section className="print-document" aria-hidden="true">
          <div className="document" dangerouslySetInnerHTML={{ __html: documentHtml }} />
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top">FM<span> / </span>FRANCISCO MORENO</a>
        <p>Reliable systems. Thoughtful engineering.</p>
        <div className="footer-links">
          <a href={profile.html_url} target="_blank" rel="noreferrer"><Code2 size={17} /> GitHub</a>
          <a href={linkedIn} target="_blank" rel="noreferrer"><ArrowUpRight size={17} /> LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}