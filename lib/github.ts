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
  default_branch: string;
  imageUrl?: string;
  imageAlt?: string;
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
  const topRepositories = getTopRepositories(repositories.filter((repository) =>
    accountType === "organization" || repository.name !== `${owner}.github.io`,
  ), 4, accountType === "organization");
  return Promise.all(topRepositories.map((repository) => fetchRepositoryImage(owner, repository, fetcher, cache)));
}

function findReadmeImage(markdown: string, owner: string, repository: GitHubRepository) {
  const candidates: Array<{ source: string; alt: string }> = [];
  const markdownImage = /!\[([^\]]*)\]\((<[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  for (const match of markdown.matchAll(markdownImage)) {
    candidates.push({ source: match[2].replace(/^<|>$/g, ""), alt: match[1] || repository.name });
  }

  const readAttribute = (tag: string, name: string) => {
    const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    return match?.[1] ?? match?.[2] ?? match?.[3];
  };
  for (const match of markdown.matchAll(/<img\b[^>]*>/gi)) {
    const source = readAttribute(match[0], "src");
    if (source) candidates.push({ source, alt: readAttribute(match[0], "alt") || repository.name });
  }

  const branch = repository.default_branch.split("/").map(encodeURIComponent).join("/");
  const baseUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}/${branch}/`;

  for (const candidate of candidates) {
    const { source, alt } = candidate;
    if (/(?:shields\.io|codecov\.io|badge|workflow|dependabot)/i.test(`${source} ${alt}`)) continue;

    try {
      const url = new URL(source.replace(/^<|>$/g, "").replace(/^\//, ""), baseUrl);
      if (url.hostname === "github.com") {
        const rawPath = url.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
        if (rawPath) return { url: `https://raw.githubusercontent.com/${rawPath[1]}/${rawPath[2]}/${rawPath[3]}/${rawPath[4]}`, alt };
      }
      if (
        url.protocol === "https:"
        && url.hostname === "raw.githubusercontent.com"
        && /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(url.pathname)
      ) {
        return { url: url.href, alt };
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function findRepositoryImageInTree(
  owner: string,
  repository: GitHubRepository,
  fetcher: typeof fetch,
  cache: RequestCache,
) {
  const tree = await readGitHubJSON<{ tree: Array<{ path: string; type: string; size?: number }> }>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}/git/trees/${encodeURIComponent(repository.default_branch)}?recursive=1`,
    fetcher,
    cache,
  );
  const images = tree.tree
    .filter(({ path, type, size }) =>
      type === "blob"
      && /\.(?:avif|gif|jpe?g|png|svg|webp)$/i.test(path)
      && (size === undefined || size < 2_000_000)
      && !/(?:badge|coverage|docusaurus|favicon|node_modules|under-construction)/i.test(path),
    )
    .map(({ path }) => {
      const name = path.split("/").pop() || path;
      const score = (/(?:screenshot|preview|demo|hero|cover|feature|tools?)/i.test(name) ? 8 : 0)
        + (/(?:^|\/)(?:images?|assets?|screenshots?)(?:\/|$)/i.test(path) ? 3 : 0)
        + (/\.(?:png|jpe?g|webp|avif)$/i.test(path) ? 2 : 0)
        - (/(?:logo|icon)/i.test(name) ? 2 : 0);
      return { path, name, score };
    })
    .sort((first, second) => second.score - first.score || first.path.length - second.path.length);
  const image = images[0];
  if (!image) return null;

  const branch = repository.default_branch.split("/").map(encodeURIComponent).join("/");
  const path = image.path.split("/").map(encodeURIComponent).join("/");
  return {
    url: `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}/${branch}/${path}`,
    alt: `${repository.name}: ${image.name}`,
  };
}

async function fetchRepositoryImage(
  owner: string,
  repository: GitHubRepository,
  fetcher: typeof fetch,
  cache: RequestCache,
) {
  const branch = repository.default_branch.split("/").map(encodeURIComponent).join("/");
  const url = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repository.name)}/${branch}/README.md`;
  try {
    const response = await fetcher(url, { cache });
    let image = null;
    if (response.ok) image = findReadmeImage(await response.text(), owner, repository);
    if (!image) image = await findRepositoryImageInTree(owner, repository, fetcher, cache);
    return image ? { ...repository, imageUrl: image.url, imageAlt: image.alt } : repository;
  } catch {
    return repository;
  }
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