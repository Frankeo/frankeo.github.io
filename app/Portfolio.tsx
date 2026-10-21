"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Code2, MapPin } from "lucide-react";
import Image from "next/image";
import type { PortfolioSections } from "../lib/google-doc";
import type { GitHubProfile, GitHubRepository } from "../lib/github";
import GitHubProjects from "./GitHubProjects";
import PdfButton from "./PdfButton";

type Language = "en" | "es";

export default function Portfolio({
  profile,
  projects,
  companyProjects,
  sections,
  documentHtml,
  githubOrganization,
  githubUsername,
  linkedInUrl,
}: {
  profile: GitHubProfile;
  projects: GitHubRepository[];
  companyProjects: GitHubRepository[];
  sections: PortfolioSections;
  documentHtml: string;
  githubOrganization: string;
  githubUsername: string;
  linkedInUrl: string;
}) {
  const [language, setLanguage] = useState<Language>("en");
  const isSpanish = language === "es";
  const name = profile.name || profile.login;
  const location = profile.location || (isSpanish ? "Barcelona, España" : "Barcelona, Spain");

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const copy = isSpanish ? {
    nav: ["Inicio", "Sobre mí", "Qué hago", "Proyectos", "Trayectoria", "Credenciales"],
    home: "Inicio",
    engineer: "Ingeniero DevOps",
    heroTitle: <>Construyo los sistemas que <em>impulsan</em> grandes productos de software.</>,
    heroIntro: "Infraestructura cloud · CI/CD · liderazgo técnico",
    explore: "Ver proyectos seleccionados",
    connect: "Conectemos",
    footnote: "INGENIERÍA DE PLATAFORMAS · CLOUD · CI/CD",
    building: "Construyendo desde 2013",
    who: "Quién soy",
    aboutTitle: <>Ingeniería con una visión más allá del código</>,
    what: "Qué hago",
    skillsTitle: "Convierto sistemas complejos en caminos claros.",
    skillsIntro: "Herramientas y prácticas para ayudar a los equipos a crear, entregar y operar software.",
    career: "Trayectoria profesional",
    experienceTitle: <>Lugares, equipos y proyectos construidos</>,
    experienceIntro: "Algunos capítulos de mi recorrido en ingeniería y entrega de plataformas.",
    beyond: "Más allá del día a día",
    credentialsTitle: <>Aprendizaje, reconocimientos e idiomas</>,
    education: "Formación",
    certifications: "Certificaciones y formación adicional",
    languages: "Idiomas",
    footer: "Construyamos algo fiable.",
    portrait: `Retrato de ${name}`,
    languageLabel: "Idioma",
  } : {
    nav: ["Home", "About me", "What I do", "Projects", "Career", "Credentials"],
    home: "Home",
    engineer: "DevOps engineer",
    heroTitle: <>I build the systems <em>behind</em> great software.</>,
    heroIntro: "Cloud infrastructure · CI/CD · technical leadership",
    explore: "Explore selected work",
    connect: "Let’s connect",
    footnote: "PLATFORM ENGINEERING · CLOUD · CI/CD",
    building: "Building since 2013",
    who: "Who I am",
    aboutTitle: <>Engineering with a view beyond the code</>,
    what: "What I do",
    skillsTitle: "Turning complex systems into clear paths forward.",
    skillsIntro: "Tools and practices I use to help teams build, ship and operate software.",
    career: "Career timeline",
    experienceTitle: <>Places, teams &amp; things built</>,
    experienceIntro: "A few chapters from my work in engineering and platform delivery.",
    beyond: "Beyond the day-to-day",
    credentialsTitle: <>Learning, recognition &amp; languages</>,
    education: "Education",
    certifications: "Certifications & training",
    languages: "Languages",
    footer: "Let’s build something reliable.",
    portrait: `Portrait of ${name}`,
    languageLabel: "Language",
  };

  const linkedIn = linkedInUrl;

  return (
    <div className="site-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={`${name}, ${copy.home}`}>
          FM<span> / </span>PORTFOLIO
        </a>
        <nav className="main-nav" aria-label={isSpanish ? "Navegación principal" : "Main navigation"}>
          {copy.nav.map((label, index) => (
            <a key={label} href={["#top", "#about", "#focus", "#projects", "#experience", "#credentials"][index]}>{label}</a>
          ))}
          <a className="social-shortcut" href={profile.html_url} target="_blank" rel="noreferrer">GitHub</a>
          <a className="social-shortcut" href={linkedIn} target="_blank" rel="noreferrer">LinkedIn</a>
          <div className="language-switch" role="group" aria-label={copy.languageLabel}>
            <button type="button" aria-pressed={!isSpanish} onClick={() => setLanguage("en")}>EN</button>
            <button type="button" aria-pressed={isSpanish} onClick={() => setLanguage("es")}>ES</button>
          </div>
          <PdfButton label={isSpanish ? "Guardar PDF" : "Save as PDF"} />
        </nav>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> {copy.engineer} <span>/</span> {location}</p>
            <h1 id="hero-title">{copy.heroTitle}</h1>
            <p className="hero-intro">{profile.bio || copy.heroIntro}</p>
            <div className="hero-actions">
              <a className="action-link action-dark" href="#projects">{copy.explore} <ArrowUpRight size={17} /></a>
              <a className="action-link action-light" href={linkedIn} target="_blank" rel="noreferrer">
                {copy.connect} <ArrowUpRight size={17} />
              </a>
            </div>
            <div className="hero-footnote"><span>FM</span> {copy.footnote}</div>
          </div>

          <figure className="portrait-frame">
            <div className="portrait-image">
              <Image
                src={profile.avatar_url}
                alt={copy.portrait}
                width={460}
                height={460}
                priority
                unoptimized
                sizes="(max-width: 700px) 82vw, 38vw"
              />
            </div>
            <figcaption><MapPin size={15} aria-hidden="true" /> {location} <span>·</span> {copy.building}</figcaption>
            <span className="portrait-index" aria-hidden="true">FM</span>
          </figure>
        </section>

        <section className="about-section" id="about" aria-labelledby="about-title">
          <div className="about-copy">
            <p className="section-kicker"><span>01</span> {copy.who}</p>
            <h2 id="about-title">{copy.aboutTitle}<span className="accent-period">.</span></h2>
            <div className="summary-copy">
              {sections.summary.map((paragraph, index) => (
                <p className={index === 0 ? "summary-lead" : "summary-detail"} key={`${index}-${paragraph}`}>
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="skills-band" id="focus" aria-labelledby="focus-title">
          <div className="skills-band-heading">
            <p className="section-kicker"><span>02</span> {copy.what}</p>
            <h2 id="focus-title">{copy.skillsTitle}</h2>
            <p>{copy.skillsIntro}</p>
          </div>
          <div className="skills-band-grid">
            {sections.skillGroups.map((group, index) => (
              <article className="skills-band-item" key={group.category}>
                <span className="skills-band-number">0{index + 1}</span>
                <h3>{group.category}</h3>
                <ul className="skill-chips">
                  {group.skills.map((skill) => <li key={skill}>{skill}</li>)}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="experience-section" id="experience" aria-labelledby="experience-title">
          <div className="experience-heading">
            <p className="section-kicker"><span>03</span> {copy.career}</p>
            <h2 id="experience-title">{copy.experienceTitle}<span className="accent-period">.</span></h2>
            <p className="experience-intro">{copy.experienceIntro}</p>
          </div>
          <ol className="experience-list">
            {sections.experience.map((job, index) => (
              <li className="experience-item" key={`${job.organization}-${job.role}`}>
                <div className="timeline-side" aria-hidden="true">
                  <span className="timeline-index">0{index + 1}</span>
                  <span className="timeline-node" />
                </div>
                <article className="timeline-entry">
                  <div className="timeline-title-row">
                    <div>
                      <p className="timeline-company">{job.organization}</p>
                      <h3>{job.role}</h3>
                    </div>
                    {job.period && <time>{job.period}</time>}
                  </div>
                  {job.highlights.length > 0 && (
                    <ul className="timeline-highlights">
                      {job.highlights.map((highlight, highlightIndex) => {
                        const separator = highlight.indexOf(":");
                        return (
                          <li key={`${highlightIndex}-${highlight}`}>
                            {separator > 0 && separator < 42 ? (
                              <><strong>{highlight.slice(0, separator)}:</strong>{highlight.slice(separator + 1)}</>
                            ) : highlight}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </article>
              </li>
            ))}
          </ol>
        </section>

        <section className="credentials-section" id="credentials" aria-labelledby="credentials-title">
          <div className="credentials-heading">
            <p className="section-kicker"><span>04</span> {copy.beyond}</p>
            <h2 id="credentials-title">{copy.credentialsTitle}<span className="accent-period">.</span></h2>
          </div>
          <div className="credentials-grid">
            <article className="credential-column">
              <p className="credential-label">{copy.education}</p>
              {sections.education.map((item) => (
                <div className="education-item" key={`${item.qualification}-${item.institution}`}>
                  <div className="education-heading">
                    <h3>{item.qualification}</h3>
                    {item.period && <time>{item.period}</time>}
                  </div>
                  <p>{item.institution}</p>
                </div>
              ))}
            </article>
            <article className="credential-column">
              <p className="credential-label">{copy.certifications}</p>
              {sections.certifications.map((group) => (
                <div className="certification-group" key={group.provider}>
                  <h3>{group.provider}</h3>
                  <ul>
                    {group.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              ))}
            </article>
            <article className="credential-column languages-column">
              <p className="credential-label">{copy.languages}</p>
              {sections.languages.map((item) => (
                <div className="language-item" key={item.language}>
                  <h3>{item.language}</h3>
                  <p>{item.proficiency}</p>
                </div>
              ))}
            </article>
          </div>
        </section>

        <GitHubProjects
          language={language}
          groups={[
            {
              key: "personal",
              owner: githubUsername,
              accountType: "user",
              label: isSpanish ? "Proyectos personales" : "Personal projects",
              title: "Francisco Moreno",
              profileUrl: profile.html_url,
              initialProjects: projects,
            },
            {
              key: "company",
              owner: githubOrganization,
              accountType: "organization",
              label: isSpanish ? "Proyectos de empresa" : "Company projects",
              title: "On The Edge Cloud",
              profileUrl: `https://github.com/${githubOrganization}`,
              initialProjects: companyProjects,
            },
          ]}
        />

        <section className="print-document" aria-hidden="true">
          <div className="document" dangerouslySetInnerHTML={{ __html: documentHtml }} />
        </section>
      </main>

      <footer className="site-footer">
        <a className="brand" href="#top">FM<span> / </span>FRANCISCO MORENO</a>
        <p>{copy.footer}</p>
        <div className="footer-links">
          <a href={profile.html_url} target="_blank" rel="noreferrer"><Code2 size={17} /> GitHub</a>
          <a href={linkedIn} target="_blank" rel="noreferrer"><ArrowUpRight size={17} /> LinkedIn</a>
        </div>
      </footer>
    </div>
  );
}