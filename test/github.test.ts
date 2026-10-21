import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchGitHubPortfolio,
  fetchLatestGitHubProjects,
  fetchLatestRepositories,
  getTopRepositories,
  type GitHubRepository,
} from "../lib/github";

const repository = (
  name: string,
  stars: number,
  { fork = false, archived = false, owner = "Frankeo" }: { fork?: boolean; archived?: boolean; owner?: string } = {},
): GitHubRepository => ({
  name,
  html_url: `https://github.com/${owner}/${name}`,
  description: null,
  language: "TypeScript",
  stargazers_count: stars,
  forks_count: 0,
  homepage: null,
  fork,
  archived,
  pushed_at: "2026-01-01T00:00:00Z",
});

test("user projects rank by stars and omit forks and archived repositories", () => {
  const projects = getTopRepositories([
    repository("old-fork", 100, { fork: true }),
    repository("archived", 90, { archived: true }),
    repository("one", 4),
    repository("two", 3),
    repository("three", 2),
    repository("four", 1),
    repository("five", 0),
  ]);
  assert.deepEqual(projects.map((project) => project.name), ["one", "two", "three", "four"]);
});

test("GitHub profile fetch returns public profile details and owned projects", async () => {
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

test("latest GitHub star counts are fetched without cache on each request", async () => {
  let refreshed = false;
  const fakeFetch: typeof fetch = async (_input, init) => {
    assert.equal(init?.cache, "no-store");
    return Response.json(refreshed
      ? [repository("changed-leader", 21), repository("old-leader", 2)]
      : [repository("old-leader", 20), repository("changed-leader", 1)]);
  };

  const first = await fetchLatestGitHubProjects("Frankeo", fakeFetch);
  refreshed = true;
  const second = await fetchLatestGitHubProjects("Frankeo", fakeFetch);
  assert.equal(first[0].name, "old-leader");
  assert.equal(second[0].name, "changed-leader");
});

test("organization projects use the public organization endpoint", async () => {
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

test("organization ranking includes high-star forks while user ranking excludes forks", async () => {
  const repos = [
    repository("react-circle-flags", 90, { fork: true, owner: "on-the-edge-cloud" }),
    repository("owned-project", 3, { owner: "on-the-edge-cloud" }),
  ];
  const fakeFetch: typeof fetch = async () => Response.json(repos);

  const organizationTop = await fetchLatestRepositories("on-the-edge-cloud", "organization", fakeFetch);
  const userTop = await fetchLatestRepositories("on-the-edge-cloud", "user", fakeFetch);
  assert.equal(organizationTop[0].name, "react-circle-flags");
  assert.equal(userTop[0].name, "owned-project");
});