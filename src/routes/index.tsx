import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  Flame,
  GitBranch,
  RefreshCw,
  Trophy,
  Users,
} from "lucide-react";

import { UserSearch } from "@/components/commitflow/UserSearch";
import { Heatmap } from "@/components/commitflow/Heatmap";
import { StatTile } from "@/components/commitflow/StatTile";
import { GoalsPanel } from "@/components/commitflow/GoalsPanel";
import { TodaysFocus } from "@/components/commitflow/TodaysFocus";
import { RepoList } from "@/components/commitflow/RepoList";
import { ActivityFeed } from "@/components/commitflow/ActivityFeed";
import { WeeklyTrend } from "@/components/commitflow/WeeklyTrend";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { GitHubError, fetchEvents, fetchRepos, fetchUser } from "@/lib/github";
import { buildDays, buildFocus, computeStreaks, dayKey, startOfWeek } from "@/lib/activity";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CommitFlow — GitHub engineering consistency" },
      {
        name: "description",
        content:
          "Track GitHub streaks, contribution trends and repository health, with daily focus suggestions for real engineering work.",
      },
      { property: "og:title", content: "CommitFlow — GitHub engineering consistency" },
      {
        property: "og:description",
        content:
          "Turn coding consistency into meaningful engineering progress: streaks, goals, repo health and a daily focus list.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [username, setUsername, usernameLoaded] = useLocalStorage<string>("cf.username", "");
  const [recent, setRecent] = useLocalStorage<string[]>("cf.recent", []);
  const [dailyRaw, setDaily] = useLocalStorage<number>("cf.goal.daily", 5);
  const [weeklyRaw, setWeekly] = useLocalStorage<number>("cf.goal.weekly", 25);
  const [doneMap, setDoneMap] = useLocalStorage<Record<string, string[]>>("cf.focus.done", {});
  const [pending, setPending] = useState("");
  // Guard against corrupt/out-of-range values in storage.
  const clamp = (n: unknown, lo: number, hi: number, d: number) =>
    typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  const daily = clamp(dailyRaw, 1, 20, 5);
  const weekly = clamp(weeklyRaw, 5, 100, 25);

  const login = username.trim();
  const enabled = usernameLoaded && login.length > 0;

  const profile = useQuery({
    queryKey: ["gh-user", login],
    queryFn: () => fetchUser(login),
    enabled,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    networkMode: "always", // fail fast offline so the network-error panel shows instead of a blank page
  });

  const repos = useQuery({
    queryKey: ["gh-repos", login],
    queryFn: () => fetchRepos(login),
    enabled: enabled && profile.isSuccess,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    networkMode: "always", // fail fast offline so the network-error panel shows instead of a blank page
  });

  const events = useQuery({
    queryKey: ["gh-events", login],
    queryFn: () => fetchEvents(login),
    enabled: enabled && profile.isSuccess,
    retry: false,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    networkMode: "always", // fail fast offline so the network-error panel shows instead of a blank page
  });

  const eventList = useMemo(() => events.data ?? [], [events.data]);
  const days = useMemo(() => buildDays(eventList), [eventList]);
  const streaks = useMemo(() => computeStreaks(days), [days]);
  const todayCount = days[days.length - 1]?.count ?? 0;
  const weekStart = startOfWeek();
  const weekDays = days.filter((d) => d.date >= weekStart);
  const weekCount = weekDays.reduce((s, d) => s + d.count, 0);
  const total90 = days.reduce((s, d) => s + d.count, 0);
  const activeDays = days.filter((d) => d.count > 0).length;

  const focus = useMemo(
    () => buildFocus(repos.data ?? [], eventList, todayCount),
    [repos.data, eventList, todayCount],
  );
  const todayKey = dayKey(new Date());
  const doneToday = doneMap[todayKey] ?? [];

  function toggleFocus(id: string) {
    setDoneMap((prev) => {
      const list = prev[todayKey] ?? [];
      const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
      return { [todayKey]: next };
    });
  }

  function search(name: string) {
    setPending(name);
    setUsername(name);
    setRecent((prev) =>
      [name, ...prev.filter((r) => r.toLowerCase() !== name.toLowerCase())].slice(0, 5),
    );
  }

  const error = (profile.error ?? repos.error ?? events.error) as Error | null;
  const loading = profile.isFetching || repos.isFetching || events.isFetching;
  const ready = profile.isSuccess && events.isSuccess;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface">
              <GitBranch className="size-4 text-primary" aria-hidden />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">CommitFlow</h1>
              <p className="text-[11px] text-muted-foreground">
                Turn coding consistency into meaningful engineering progress.
              </p>
            </div>
          </div>
          <div className="md:w-[420px]">
            <UserSearch
              value={login || pending}
              onSubmit={search}
              recent={recent}
              onClearRecent={() => setRecent([])}
              busy={loading}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {!enabled && !loading && (
          <div className="panel mx-auto mt-10 max-w-xl p-8 text-center">
            <GitBranch className="mx-auto size-6 text-primary" aria-hidden />
            <h2 className="mt-4 text-lg font-semibold text-balance-tight">
              Measure engineering progress, not commit counts
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Enter any GitHub username to see streaks, weekly trends, repository health and a focus
              list built from real repository signals. Everything runs on public GitHub data; your
              goals stay in this browser.
            </p>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="panel mx-auto mt-10 flex max-w-xl items-start gap-3 border-destructive/40 p-5"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="flex-1">
              <h2 className="text-sm font-semibold">
                {error instanceof GitHubError && error.rateLimited
                  ? "GitHub rate limit reached"
                  : error instanceof GitHubError && error.status === 0
                    ? "Network error"
                    : "Couldn't load that profile"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
              {!(error instanceof GitHubError && (error.rateLimited || error.status === 404)) && (
                <button
                  onClick={() => {
                    void profile.refetch();
                    void repos.refetch();
                    void events.refetch();
                  }}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs panel-hover"
                >
                  <RefreshCw className="size-3" aria-hidden /> Retry
                </button>
              )}
            </div>
          </div>
        )}

        {loading && !ready && !error && (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className={`panel h-28 animate-pulse ${i === 4 ? "md:col-span-3" : ""} ${i > 4 ? "md:col-span-2" : ""}`}
              />
            ))}
          </div>
        )}

        {ready && !error && profile.data && (
          <div className="space-y-6">
            <section className="panel flex flex-wrap items-center gap-4 p-5">
              <img
                src={profile.data.avatar_url}
                alt=""
                width={56}
                height={56}
                className="size-14 rounded-full border border-border"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <h2 className="text-base font-semibold">
                    {profile.data.name ?? profile.data.login}
                  </h2>
                  <a
                    href={profile.data.html_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="font-mono text-xs text-accent hover:underline"
                  >
                    @{profile.data.login}
                  </a>
                </div>
                {profile.data.bio && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {profile.data.bio}
                  </p>
                )}
              </div>
              <div className="flex w-full gap-5 text-xs text-muted-foreground sm:w-auto">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3" aria-hidden /> {profile.data.followers} followers
                </span>
                <span>{profile.data.public_repos} repos</span>
              </div>
            </section>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Current streak"
                value={`${streaks.current}d`}
                hint={todayCount > 0 ? "Active today" : "Nothing logged today yet"}
                icon={Flame}
                tone="primary"
              />
              <StatTile
                label="Longest streak"
                value={`${streaks.longest}d`}
                hint="Within the last 13 weeks"
                icon={Trophy}
                tone="accent"
              />
              <StatTile
                label="Active days"
                value={`${activeDays}/${days.length}`}
                hint={`${Math.round((activeDays / days.length) * 100)}% consistency`}
                icon={CalendarCheck}
              />
              <StatTile
                label="Activity points"
                value={total90}
                hint="Weighted, last 13 weeks"
                icon={GitBranch}
              />
            </div>

            <section className="panel p-5" aria-label="Contribution heatmap">
              <Heatmap days={days} />
            </section>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <TodaysFocus items={focus} done={doneToday} onToggle={toggleFocus} />
                <ActivityFeed events={eventList} />
              </div>
              <div className="space-y-6">
                <GoalsPanel
                  daily={daily}
                  weekly={weekly}
                  onDaily={setDaily}
                  onWeekly={setWeekly}
                  todayCount={todayCount}
                  weekCount={weekCount}
                  weekActiveDays={weekDays.filter((d) => d.count > 0).length}
                />
                <WeeklyTrend days={days} />
                <RepoList repos={repos.data ?? []} />
              </div>
            </div>

            <p className="pb-4 text-center text-[11px] leading-relaxed text-muted-foreground">
              Built on GitHub&rsquo;s public activity API, which covers roughly the last 90 days of
              public events. CommitFlow never encourages empty commits — consistency only counts
              when the work is real.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
