"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Code2, Star } from "lucide-react";
import Image from "next/image";
import { fetchLatestRepositories, type GitHubAccountType, type GitHubRepository } from "../lib/github";

export interface GitHubProjectGroup {
  key: string;
  owner: string;
  accountType: GitHubAccountType;
  label: string;
  title: string;
  profileUrl: string;
  initialProjects: GitHubRepository[];
}

function ProjectArtwork({ project }: { project: GitHubRepository }) {
  if (project.imageUrl) {
    return (
      <div className="project-art project-art-image">
        <Image
          src={project.imageUrl}
          alt={project.imageAlt || `${project.name} repository preview`}
          fill
          unoptimized
          sizes="(max-width: 680px) 90vw, 42vw"
        />
      </div>
    );
  }

  return (
    <div className="project-art project-art-fallback">
      <span>{project.language || "Open source"}</span>
      <strong>{project.name}</strong>
      <Code2 size={38} strokeWidth={1.2} aria-hidden="true" />
    </div>
  );
}

export default function GitHubProjects({
  groups,
}: {
  groups: GitHubProjectGroup[];
}) {
  const [projectsByGroup, setProjectsByGroup] = useState<Record<string, GitHubRepository[]>>(
    Object.fromEntries(groups.map((group) => [group.key, group.initialProjects])),
  );

  useEffect(() => {
    let active = true;
    for (const group of groups) {
      fetchLatestRepositories(group.owner, group.accountType)
        .then((latestProjects) => {
          if (active) {
            setProjectsByGroup((current) => ({ ...current, [group.key]: latestProjects }));
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
    };
  }, [groups]);

  return (
    <section className="projects-section" id="projects" aria-labelledby="projects-title">
      <div className="section-heading">
        <p className="section-kicker"><span>05</span> Open source / <span className="live-label">GitHub live</span></p>
        <div className="section-title-row">
          <h2 id="projects-title">Selected work<span className="accent-period">.</span></h2>
          <p>Four public projects, ranked by current community stars.</p>
        </div>
      </div>
      <div className="project-groups">
        {groups.map((group) => (
          <div className="project-group" key={group.key}>
            <div className="project-group-heading">
              <div>
                <p className="group-label">{group.label}</p>
                <h3>{group.title}</h3>
              </div>
              <a href={group.profileUrl} target="_blank" rel="noreferrer">
                View GitHub <ArrowUpRight size={15} aria-hidden="true" />
              </a>
            </div>
            <div className="project-grid" aria-live="polite">
              {(projectsByGroup[group.key] || []).map((project, index) => (
                <article className="project-item" key={project.name}>
                  <ProjectArtwork project={project} />
                  <div className="project-topline">
                    <span className="project-number">0{index + 1} / 04</span>
                    <span className="project-language"><Code2 size={15} aria-hidden="true" /> {project.language || "Open source"}</span>
                  </div>
                  <h3>{project.name}</h3>
                  <p className="project-description">{project.description || "An open-source project."}</p>
                  <div className="project-footer">
                    <span className="project-stars"><Star size={15} aria-hidden="true" /> {project.stargazers_count}</span>
                    <div className="project-links">
                      {project.homepage && (
                        <a href={project.homepage} target="_blank" rel="noreferrer">
                          Live site <ArrowUpRight size={15} aria-hidden="true" />
                        </a>
                      )}
                      <a href={project.html_url} target="_blank" rel="noreferrer">
                        Source <Code2 size={15} aria-hidden="true" />
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}