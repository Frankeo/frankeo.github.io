import config from "../document-config.json";
import { fetchGitHubOrganizationProjects, fetchGitHubPortfolio } from "../lib/github";
import { extractPortfolioSections, fetchPublicGoogleDoc } from "../lib/google-doc";
import Portfolio from "./Portfolio";

export const metadata = {
  title: `${config.title} | ${config.githubUsername}`,
};

export default async function HomePage() {
  const [{ profile, projects }, companyProjects, documentHtml] = await Promise.all([
    fetchGitHubPortfolio(config.githubUsername),
    fetchGitHubOrganizationProjects(config.githubOrganization),
    fetchPublicGoogleDoc(config.googleDocUrl),
  ]);
  const { summary, skillGroups, experience, education, certifications, languages } = extractPortfolioSections(documentHtml);

  return (
    <Portfolio
      profile={profile}
      projects={projects}
      companyProjects={companyProjects}
      sections={{ summary, skillGroups, experience, education, certifications, languages }}
      documentHtml={documentHtml}
      githubOrganization={config.githubOrganization}
      githubUsername={config.githubUsername}
      linkedInUrl={config.linkedinUrl}
    />
  );
}