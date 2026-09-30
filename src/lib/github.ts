const API = "https://api.github.com";

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
    public rateLimited = false,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

async function gh<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (!res.ok) {
    const remaining = res.headers.get("x-ratelimit-remaining");
    if ((res.status === 403 || res.status === 429) && remaining === "0") {
      const reset = Number(res.headers.get("x-ratelimit-reset") ?? 0) * 1000;
      const mins = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 60000)) : null;
      throw new GitHubError(
        `GitHub's hourly request limit was reached${mins ? `. Try again in about ${mins} minute${mins === 1 ? "" : "s"}` : ""}.`,
        res.status,
        true,
      );
    }
    if (res.status === 404) throw new GitHubError("No GitHub user with that username.", 404);
    let detail = "";
    try {
      detail = ((await res.json()) as { message?: string }).message ?? "";
    } catch {
      /* ignore */
    }
    throw new GitHubError(detail || `GitHub request failed (${res.status}).`, res.status);
  }

  return (await res.json()) as T;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  html_url: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  location: string | null;
  company: string | null;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
  archived: boolean;
  fork: boolean;
  has_issues: boolean;
  license: { spdx_id: string | null } | null;
  topics?: string[];
  size: number;
}

export interface GitHubEvent {
  id: string;
  type: string;
  created_at: string;
  repo: { id: number; name: string };
  payload: {
    commits?: { sha: string; message: string }[];
    size?: number;
    action?: string;
    ref_type?: string;
    release?: { tag_name: string; html_url: string; name: string | null };
    issue?: { number: number; title: string; html_url: string };
    pull_request?: { number: number; title: string; html_url: string; merged?: boolean };
  };
}

export const fetchUser = (login: string) => gh<GitHubUser>(`/users/${encodeURIComponent(login)}`);

export const fetchRepos = (login: string) =>
  gh<GitHubRepo[]>(`/users/${encodeURIComponent(login)}/repos?sort=pushed&per_page=100&type=owner`);

export async function fetchEvents(login: string): Promise<GitHubEvent[]> {
  const pages = await Promise.all(
    [1, 2, 3].map((p) =>
      gh<GitHubEvent[]>(
        `/users/${encodeURIComponent(login)}/events/public?per_page=100&page=${p}`,
      ).catch((err: unknown) => {
        if (err instanceof GitHubError && err.rateLimited) throw err;
        return [] as GitHubEvent[];
      }),
    ),
  );
  const seen = new Set<string>();
  return pages
    .flat()
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
