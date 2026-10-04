import { CircleDot, GitFork, Star, FolderGit2 } from "lucide-react";
import { repoHealth } from "@/lib/activity";
import type { GitHubRepo } from "@/lib/github";

const LABEL_CLASS: Record<string, string> = {
  Active: "text-primary border-primary/40",
  Steady: "text-accent border-accent/40",
  Cooling: "text-warning border-warning/40",
  Dormant: "text-muted-foreground border-border",
  Archived: "text-muted-foreground border-border",
};

function ago(days: number) {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

export function RepoList({ repos }: { repos: GitHubRepo[] }) {
  const top = repos.filter((r) => !r.archived).slice(0, 8);

  return (
    <section className="panel p-5" aria-labelledby="repos-heading">
      <div className="flex items-center gap-2">
        <FolderGit2 className="size-4 text-primary" aria-hidden />
        <h2 id="repos-heading" className="text-sm font-semibold">
          Repository activity
        </h2>
      </div>

      {top.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No public repositories yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {top.map((repo) => {
            const h = repoHealth(repo);
            return (
              <li key={repo.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={repo.html_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-sm font-medium hover:text-primary hover:underline"
                  >
                    {repo.name}
                  </a>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${LABEL_CLASS[h.label]}`}
                  >
                    {h.label}
                  </span>
                </div>
                {repo.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {repo.description}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                  {repo.language && <span>{repo.language}</span>}
                  <span className="inline-flex items-center gap-1">
                    <Star className="size-3" aria-hidden />
                    {repo.stargazers_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork className="size-3" aria-hidden />
                    {repo.forks_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CircleDot className="size-3" aria-hidden />
                    {repo.open_issues_count}
                  </span>
                  <span>pushed {ago(h.daysSincePush)}</span>
                  <span className="font-mono">health {h.score}</span>
                </div>
                {h.gaps.length > 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Gaps: {h.gaps.slice(0, 3).join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
