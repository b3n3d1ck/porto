// Run with Node.js 18+: node scripts/sync-github.mjs
// Optional: GITHUB_TOKEN increases the API rate limit. No token is needed in the browser.
import { writeFile, rename, rm } from 'node:fs/promises';

const username = 'b3n3d1ck';
const output = new URL('../src/data/github-projects.json', import.meta.url);
const temporary = new URL('../src/data/github-projects.json.tmp', import.meta.url);
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'porto-github-sync',
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

// Security tools verified against repository READMEs; unknown projects default to Development.
const securityRepos = new Set([
  'ai-scam-detector', 'scam-detector', 'nightjar', 'murs',
  'web-security-auditor', 'shellhound', 'ghostmap',
]);

try {
  const repositories = new Map();
  for (let page = 1; ; page++) {
    const url = new URL(`https://api.github.com/users/${username}/repos`);
    url.search = new URLSearchParams({ type: 'owner', sort: 'full_name', direction: 'asc', per_page: '100', page: String(page) });
    const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      throw new Error(`GitHub API page ${page}: ${response.status} ${response.statusText}. Snapshot unchanged; check GITHUB_TOKEN or retry later.`);
    }
    const repos = await response.json();
    if (!Array.isArray(repos)) throw new Error(`Unexpected GitHub response on page ${page}`);
    for (const repo of repos) {
      if (typeof repo.name !== 'string' || typeof repo.html_url !== 'string') {
        throw new Error(`Invalid repository metadata on page ${page}`);
      }
      if (repo.private || repo.name.toLowerCase() === username.toLowerCase()) continue;
      repositories.set(repo.id, repo);
    }
    console.log(`Page ${page}: ${repos.length} public repositories`);
    // Request the next page even for a partial page; an empty page proves completion.
    if (repos.length === 0) break;
  }
  const projects = [...repositories.values()]
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)
    .map((repo) => ({
      title: repo.name,
      // Keep GitHub descriptions verbatim; missing descriptions remain empty.
      description: repo.description ?? '',
      tech: [...new Set([...(repo.language ? [repo.language] : []), ...(repo.topics ?? [])])],
      category: securityRepos.has(repo.name) ? 'Security' : 'Development',
      repository: repo.html_url,
      // A repository link is always useful, even when no deployed homepage is set.
      url: /^https?:\/\//i.test(repo.homepage ?? '') ? repo.homepage : repo.html_url,
      ...(repo.language ? { language: repo.language } : {}),
    }));
  if (projects.length === 0) throw new Error('No project repositories found; refusing to replace snapshot.');
  await writeFile(temporary, `${JSON.stringify(projects, null, 2)}\n`, 'utf8');
  await rename(temporary, output);
  console.log(`Saved ${projects.length} projects (profile README repository excluded).`);
} catch (error) {
  await rm(temporary, { force: true }).catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
}
