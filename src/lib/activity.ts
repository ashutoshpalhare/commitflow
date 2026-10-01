import type { GitHubEvent, GitHubRepo } from "./github";

export const HEATMAP_DAYS = 91;

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseDayKey(key: string): Date {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Weight per event type — real engineering work counts more than noise. */
function weight(e: GitHubEvent): number {
  switch (e.type) {
    case "PushEvent":
      return Math.max(1, e.payload.commits?.length ?? e.payload.size ?? 1);
    case "PullRequestEvent":
      return 3;
    case "ReleaseEvent":
      return 4;
    case "IssuesEvent":
    case "PullRequestReviewEvent":
      return 2;
    case "IssueCommentEvent":
    case "PullRequestReviewCommentEvent":
    case "CommitCommentEvent":
      return 1;
    case "CreateEvent":
      return e.payload.ref_type === "repository" ? 2 : 1;
    default:
      return 0;
  }
}

export interface DayBucket {
  key: string;
  date: Date;
  count: number;
  events: GitHubEvent[];
}

export function buildDays(events: GitHubEvent[], days = HEATMAP_DAYS): DayBucket[] {
  const map = new Map<string, DayBucket>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    map.set(dayKey(d), { key: dayKey(d), date: d, count: 0, events: [] });
  }

  for (const e of events) {
    const k = dayKey(new Date(e.created_at));
    const bucket = map.get(k);
    if (!bucket) continue;
    bucket.count += weight(e);
    bucket.events.push(e);
  }

  return [...map.values()];
}

export function heatLevel(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const r = count / max;
  if (r <= 0.15) return 1;
  if (r <= 0.35) return 2;
  if (r <= 0.65) return 3;
  return 4;
}

export function computeStreaks(days: DayBucket[]): { current: number; longest: number } {
  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    if (!day) break;
    if (day.count > 0) current++;
    else if (i === days.length - 1) continue; // today still open
    else break;
  }

  return { current, longest };
}

export function weeklyBuckets(days: DayBucket[]): { label: string; total: number; days: number }[] {
  const weeks: { label: string; total: number; days: number }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const slice = days.slice(i, i + 7);
    if (!slice.length) continue;
    weeks.push({
      label: slice[0].date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      total: slice.reduce((s, d) => s + d.count, 0),
      days: slice.filter((d) => d.count > 0).length,
    });
  }
  return weeks;
}

export function eventsSince(events: GitHubEvent[], since: Date): GitHubEvent[] {
  return events.filter((e) => new Date(e.created_at) >= since);
}

export function startOfWeek(d = new Date()): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const diff = (date.getDay() + 6) % 7; // Monday start
  date.setDate(date.getDate() - diff);
  return date;
}

export interface RepoHealth {
  score: number;
  label: "Active" | "Steady" | "Cooling" | "Dormant" | "Archived";
  daysSincePush: number;
  signals: string[];
  gaps: string[];
}

export function repoHealth(repo: GitHubRepo): RepoHealth {
  const daysSincePush = Math.floor(
    (Date.now() - new Date(repo.pushed_at).getTime()) / 86_400_000,
  );

  let score = 0;
  if (daysSincePush <= 3) score += 45;
  else if (daysSincePush <= 14) score += 32;
  else if (daysSincePush <= 45) score += 18;
  else if (daysSincePush <= 120) score += 8;

  const signals: string[] = [];
  const gaps: string[] = [];

  if (repo.description) {
    score += 12;
    signals.push("Described");
  } else gaps.push("No description");

  if (repo.license?.spdx_id && repo.license.spdx_id !== "NOASSERTION") {
    score += 10;
    signals.push(repo.license.spdx_id);
  } else gaps.push("No license");

  if ((repo.topics?.length ?? 0) > 0) {
    score += 8;
    signals.push("Topics set");
  } else gaps.push("No topics");

  if (repo.has_issues) score += 5;
  if (repo.stargazers_count > 0) score += Math.min(10, repo.stargazers_count);
  if (repo.open_issues_count > 0) gaps.push(`${repo.open_issues_count} open issue(s)`);

  score = Math.max(0, Math.min(100, score));

  const label: RepoHealth["label"] = repo.archived
    ? "Archived"
    : daysSincePush <= 7
      ? "Active"
      : daysSincePush <= 30
        ? "Steady"
        : daysSincePush <= 90
          ? "Cooling"
          : "Dormant";

  return { score, label, daysSincePush, signals, gaps };
}

export interface FocusSuggestion {
  id: string;
  title: string;
  detail: string;
  kind: "Docs" | "Tests" | "Maintenance" | "Review" | "Release" | "Quality" | "Accessibility";
  repo?: string;
  url?: string;
}

/** Suggest meaningful engineering work — never "make a commit to keep the streak". */
export function buildFocus(
  repos: GitHubRepo[],
  events: GitHubEvent[],
  todayCount: number,
): FocusSuggestion[] {
  const out: FocusSuggestion[] = [];
  const active = repos.filter((r) => !r.archived);

  const noDesc = active.find((r) => !r.description);
  if (noDesc)
    out.push({
      id: "desc",
      kind: "Docs",
      title: `Describe ${noDesc.name}`,
      detail: "A one-line description and topics make the project understandable at a glance.",
      repo: noDesc.full_name,
      url: noDesc.html_url,
    });

  const stale = active
    .filter((r) => !r.fork)
    .map((r) => ({ r, h: repoHealth(r) }))
    .filter((x) => x.h.daysSincePush > 30 && x.h.daysSincePush < 365)
    .sort((a, b) => b.r.stargazers_count - a.r.stargazers_count)[0];
  if (stale)
    out.push({
      id: "stale",
      kind: "Maintenance",
      title: `Revisit ${stale.r.name}`,
      detail: `Untouched for ${stale.h.daysSincePush} days — update dependencies, close dead issues, or write down next steps.`,
      repo: stale.r.full_name,
      url: stale.r.html_url,
    });

  const issueHeavy = active
    .filter((r) => r.open_issues_count > 0)
    .sort((a, b) => b.open_issues_count - a.open_issues_count)[0];
  if (issueHeavy)
    out.push({
      id: "issues",
      kind: "Quality",
      title: `Close an open issue in ${issueHeavy.name}`,
      detail: `${issueHeavy.open_issues_count} open item(s). Fixing one real bug beats ten filler commits.`,
      repo: issueHeavy.full_name,
      url: `${issueHeavy.html_url}/issues`,
    });

  const noLicense = active.find(
    (r) => !r.fork && (!r.license?.spdx_id || r.license.spdx_id === "NOASSERTION"),
  );
  if (noLicense)
    out.push({
      id: "license",
      kind: "Maintenance",
      title: `Add a license to ${noLicense.name}`,
      detail: "Unlicensed code can't legally be reused. A five-minute fix with lasting value.",
      repo: noLicense.full_name,
      url: noLicense.html_url,
    });

  const pushHeavy = events.filter((e) => e.type === "PushEvent").length;
  const reviewCount = events.filter(
    (e) => e.type === "PullRequestReviewEvent" || e.type === "PullRequestEvent",
  ).length;
  if (pushHeavy > 10 && reviewCount === 0)
    out.push({
      id: "review",
      kind: "Review",
      title: "Open a pull request instead of pushing to main",
      detail: "Reviewable changes create a record of intent and make your work easier to follow.",
    });

  const topRepo = active.filter((r) => !r.fork).sort((a, b) => b.stargazers_count - a.stargazers_count)[0];
  if (topRepo)
    out.push({
      id: "a11y",
      kind: "Accessibility",
      title: `Audit ${topRepo.name} for accessibility`,
      detail: "Keyboard navigation, focus states and labels — small fixes, real users helped.",
      repo: topRepo.full_name,
      url: topRepo.html_url,
    });

  if (topRepo)
    out.push({
      id: "tests",
      kind: "Tests",
      title: `Cover a risky path in ${topRepo.name} with a test`,
      detail: "Pick the code you're most afraid to change and pin its behaviour down.",
      repo: topRepo.full_name,
      url: topRepo.html_url,
    });

  const releasable = active.find(
    (r) => !r.fork && Math.floor((Date.now() - new Date(r.pushed_at).getTime()) / 86_400_000) < 14,
  );
  if (releasable && todayCount > 0)
    out.push({
      id: "release",
      kind: "Release",
      title: `Cut a release for ${releasable.name}`,
      detail: "Recent work shipped but untagged. A changelog turns commits into progress.",
      repo: releasable.full_name,
      url: `${releasable.html_url}/releases`,
    });

  return out.slice(0, 4);
}
