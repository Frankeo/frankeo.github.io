export interface GitHubProfile {
  name: string | null;
  login: string;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  location: string | null;
}

export interface GitHubRepository {
  name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  homepage: string | null;
  fork: boolean;
  archived: boolean;
  pushed_at: string;
}

export type GitHubAccountType = "user" | "organization";

export function getTopRepositories(repositories: GitHubRepository[], count = 4, includeForks = false) {
  return repositories
    .filter((repository) => (includeForks || !repository.fork) && !repository.archived)
    .sort((first, second) =>
      second.stargazers_count - first.stargazers_count
      || second.forks_count - first.forks_count
      || second.pushed_at.localeCompare(first.pushed_at),
    )
    .slice(0, count);
}

function repositoriesUrl(owner: string, accountType: GitHubAccountType) {
  const endpoint = accountType === "organization" ? "orgs" : "users";
  const ownerType = accountType === "organization" ? "public" : "owner";
  return `https://api.github.com/${endpoint}/${encodeURIComponent(owner)}/repos?type=${ownerType}&sort=updated&per_page=100`;
}

async function readRepositories(
  owner: string,
  accountType: GitHubAccountType,
  fetcher: typeof fetch,
  cache: RequestCache,
) {
  const repositories = await readGitHubJSON<GitHubRepository[]>(repositoriesUrl(owner, accountType), fetcher, cache);
  return getTopRepositories(repositories.filter((repository) =>
    accountType === "organization" || repository.name !== `${owner}.github.io`,
  ), 4, accountType === "organization");
}

async function readGitHubJSON<T>(url: string, fetcher: typeof fetch, cache: RequestCache = "force-cache"): Promise<T> {
  const response = await fetcher(url, {
    headers: { Accept: "application/vnd.github+json" },
    cache,
  });
  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}). Try building again later.`);
  }
  return response.json() as Promise<T>;
}

export async function fetchGitHubPortfolio(username: string, fetcher: typeof fetch = fetch) {
  const encodedUsername = encodeURIComponent(username);
  const [profile, projects] = await Promise.all([
    readGitHubJSON<GitHubProfile>(`https://api.github.com/users/${encodedUsername}`, fetcher),
    readRepositories(username, "user", fetcher, "force-cache"),
  ]);

  if (!/^https:\/\/avatars\.githubusercontent\.com\//.test(profile.avatar_url)) {
    throw new Error("GitHub returned an invalid profile photo URL.");
  }

  return {
    profile,
    projects,
  };
}

export async function fetchLatestGitHubProjects(username: string, fetcher: typeof fetch = fetch) {
  return fetchLatestRepositories(username, "user", fetcher);
}

export async function fetchGitHubOrganizationProjects(owner: string, fetcher: typeof fetch = fetch) {
  return readRepositories(owner, "organization", fetcher, "force-cache");
}

export async function fetchLatestRepositories(
  owner: string,
  accountType: GitHubAccountType,
  fetcher: typeof fetch = fetch,
) {
  return readRepositories(owner, accountType, fetcher, "no-store");
}