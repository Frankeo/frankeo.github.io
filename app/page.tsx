import config from "../document-config.json";
import { fetchGitHubOrganizationProjects, fetchGitHubPortfolio } from "../lib/github";
import { fetchPublicGoogleDoc } from "../lib/google-doc";
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
          <a href="#resume">CV</a>
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

        <section className="resume-section" id="resume" aria-labelledby="resume-title">
          <div className="resume-heading">
            <div>
              <p className="section-kicker"><span>02</span> Background</p>
              <h2 id="resume-title">Experience &amp; approach</h2>
            </div>
            <PdfButton label="Download CV as PDF" />
          </div>
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