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

/** GitHub logins: 1–39 chars, alphanumeric or single hyphens, no leading/trailing hyphen. */
export const USERNAME_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

async function ghRaw(path: string): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      headers: { Accept: "application/vnd.github+json" },
    });
  } catch {
    throw new GitHubError(
      "Couldn't reach GitHub. Check your internet connection and try again.",
      0,
    );
  }

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

  return res;
}

async function gh<T>(path: string): Promise<T> {
  return (await (await ghRaw(path)).json()) as T;
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

const MAX_REPO_PAGES = 5; // up to 500 repos; caps request cost for huge accounts

/** Follows GitHub's Link header so accounts with >100 repos are fully covered. */
export async function fetchRepos(login: string): Promise<GitHubRepo[]> {
  const all: GitHubRepo[] = [];
  for (let page = 1; page <= MAX_REPO_PAGES; page++) {
    const res = await ghRaw(
      `/users/${encodeURIComponent(login)}/repos?sort=pushed&per_page=100&type=owner&page=${page}`,
    );
    const batch = (await res.json()) as GitHubRepo[];
    all.push(...batch);
    if (batch.length < 100 || !/rel="next"/.test(res.headers.get("link") ?? "")) break;
  }
  return all;
}

/** Fetched sequentially and stops early, so light accounts cost one request, not three. */
export async function fetchEvents(login: string): Promise<GitHubEvent[]> {
  const pages: GitHubEvent[][] = [];
  for (let p = 1; p <= 3; p++) {
    try {
      const batch = await gh<GitHubEvent[]>(
        `/users/${encodeURIComponent(login)}/events/public?per_page=100&page=${p}`,
      );
      pages.push(batch);
      if (batch.length < 100) break;
    } catch (err) {
      // Page 1 failures and rate limits are real errors; later pages (GitHub caps at ~300 events) are not.
      if (p === 1 || (err instanceof GitHubError && err.rateLimited)) throw err;
      break;
    }
  }
  const seen = new Set<string>();
  return pages
    .flat()
    .filter((e) => (seen.has(e.id) ? false : (seen.add(e.id), true)))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
