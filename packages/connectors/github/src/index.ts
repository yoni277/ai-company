import type { GithubMetrics } from '@ai-company/shared-types';

export interface GithubConnectorConfig {
  token: string;
  /** `owner/repo` */
  repository: string;
}

/**
 * GitHub connector v1 — collects open issues, PRs, recent commits, repo metadata.
 * No LLM. No derived insights.
 */
export class GithubConnector {
  private readonly apiBase = 'https://api.github.com';

  constructor(private readonly config?: GithubConnectorConfig) {}

  get live(): boolean {
    return Boolean(this.config?.token && this.config?.repository);
  }

  async fetchMetrics(): Promise<GithubMetrics> {
    if (!this.live || !this.config) {
      return mockGithubMetrics();
    }

    const [owner, repo] = this.config.repository.split('/');
    if (!owner || !repo) {
      throw new Error(`GITHUB_REPOSITORY must be owner/repo, got: ${this.config.repository}`);
    }

    const headers = {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${this.config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    };

    const repoRes = await fetch(`${this.apiBase}/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      throw new Error(`GitHub repo fetch failed: ${repoRes.status} ${await repoRes.text()}`);
    }
    const repoMeta = (await repoRes.json()) as { full_name?: string; open_issues_count?: number };

    const [issues, pulls, commits] = await Promise.all([
      fetch(`${this.apiBase}/repos/${owner}/${repo}/issues?state=open&per_page=100`, { headers }),
      fetch(`${this.apiBase}/repos/${owner}/${repo}/pulls?state=open&per_page=100`, { headers }),
      fetch(
        `${this.apiBase}/repos/${owner}/${repo}/commits?since=${encodeURIComponent(sevenDaysAgoIso())}&per_page=100`,
        { headers },
      ),
    ]);

    if (!issues.ok || !pulls.ok || !commits.ok) {
      throw new Error(
        `GitHub metrics fetch failed: issues=${issues.status} pulls=${pulls.status} commits=${commits.status}`,
      );
    }

    const issueList = (await issues.json()) as Array<{ pull_request?: unknown }>;
    const pullList = (await pulls.json()) as unknown[];
    const commitList = (await commits.json()) as unknown[];

    const openIssuesOnly = issueList.filter((i) => !i.pull_request);

    return {
      openIssues: openIssuesOnly.length,
      openPullRequests: pullList.length,
      commitsLast7Days: commitList.length,
      repositoryName: repoMeta.full_name ?? `${owner}/${repo}`,
    };
  }
}

function sevenDaysAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}

function mockGithubMetrics(): GithubMetrics {
  return {
    openIssues: 4,
    openPullRequests: 2,
    commitsLast7Days: 18,
    repositoryName: 'ai-company (mock)',
  };
}

export function githubConnectorFromEnv(): GithubConnector {
  const token = process.env.GITHUB_TOKEN ?? '';
  const repository = process.env.GITHUB_REPOSITORY ?? '';
  if (token && repository) {
    return new GithubConnector({ token, repository });
  }
  return new GithubConnector();
}
