import {
  GitCommit,
  GitPullRequest,
  CircleDot,
  Tag,
  MessageSquare,
  Sparkles,
  Activity,
} from "lucide-react";
import { useState } from "react";
import type { GitHubEvent } from "@/lib/github";

type Tab = "all" | "commits" | "pulls" | "issues" | "releases";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "commits", label: "Commits" },
  { id: "pulls", label: "Pull requests" },
  { id: "issues", label: "Issues" },
  { id: "releases", label: "Releases" },
];

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function matches(e: GitHubEvent, tab: Tab) {
  if (tab === "all") return true;
  if (tab === "commits") return e.type === "PushEvent";
  if (tab === "pulls") return e.type.startsWith("PullRequest");
  if (tab === "issues") return e.type === "IssuesEvent" || e.type === "IssueCommentEvent";
  return e.type === "ReleaseEvent";
}

function describe(e: GitHubEvent) {
  const repo = e.repo.name;
  switch (e.type) {
    case "PushEvent": {
      // GitHub's public events often omit commit details; don't show a misleading "0 commits".
      const n = e.payload.commits?.length || e.payload.size || 0;
      const msg = e.payload.commits?.[0]?.message.split("\n")[0];
      return {
        icon: GitCommit,
        title: n > 0 ? `${n} commit${n === 1 ? "" : "s"} to ${repo}` : `Pushed to ${repo}`,
        detail: msg,
        href: `https://github.com/${repo}`,
      };
    }
    case "PullRequestEvent":
      return {
        icon: GitPullRequest,
        title: `${e.payload.action === "closed" && e.payload.pull_request?.merged ? "Merged" : (e.payload.action ?? "Updated")} PR #${e.payload.pull_request?.number} in ${repo}`,
        detail: e.payload.pull_request?.title,
        href: e.payload.pull_request?.html_url,
      };
    case "PullRequestReviewEvent":
      return {
        icon: MessageSquare,
        title: `Reviewed PR #${e.payload.pull_request?.number} in ${repo}`,
        detail: e.payload.pull_request?.title,
        href: e.payload.pull_request?.html_url,
      };
    case "IssuesEvent":
      return {
        icon: CircleDot,
        title: `${e.payload.action ?? "Updated"} issue #${e.payload.issue?.number} in ${repo}`,
        detail: e.payload.issue?.title,
        href: e.payload.issue?.html_url,
      };
    case "IssueCommentEvent":
      return {
        icon: MessageSquare,
        title: `Commented on #${e.payload.issue?.number} in ${repo}`,
        detail: e.payload.issue?.title,
        href: e.payload.issue?.html_url,
      };
    case "ReleaseEvent":
      return {
        icon: Tag,
        title: `Released ${e.payload.release?.tag_name} in ${repo}`,
        detail: e.payload.release?.name ?? undefined,
        href: e.payload.release?.html_url,
      };
    case "CreateEvent":
      return {
        icon: Sparkles,
        title: `Created ${e.payload.ref_type} in ${repo}`,
        detail: undefined,
        href: `https://github.com/${repo}`,
      };
    default:
      return {
        icon: Activity,
        title: `${e.type.replace("Event", "")} in ${repo}`,
        detail: undefined,
        href: `https://github.com/${repo}`,
      };
  }
}

export function ActivityFeed({ events }: { events: GitHubEvent[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const filtered = events.filter((e) => matches(e, tab)).slice(0, 25);

  return (
    <section className="panel p-5" aria-labelledby="feed-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-primary" aria-hidden />
          <h2 id="feed-heading" className="text-sm font-semibold">
            Recent work
          </h2>
        </div>
        <div className="flex flex-wrap gap-1" role="group" aria-label="Activity filter">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${
                tab === t.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          No public {tab === "all" ? "activity" : tab} in the last 90 days.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((e) => {
            const d = describe(e);
            const Icon = d.icon;
            return (
              <li key={e.id} className="flex gap-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-sm hover:text-primary hover:underline"
                  >
                    {d.title}
                  </a>
                  {d.detail && (
                    <p className="mt-0.5 line-clamp-1 font-mono text-[11px] text-muted-foreground">
                      {d.detail}
                    </p>
                  )}
                </div>
                <time
                  dateTime={e.created_at}
                  className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
                >
                  {relTime(e.created_at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
