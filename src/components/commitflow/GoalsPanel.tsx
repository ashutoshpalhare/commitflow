import { Target } from "lucide-react";

interface Props {
  daily: number;
  weekly: number;
  onDaily: (n: number) => void;
  onWeekly: (n: number) => void;
  todayCount: number;
  weekCount: number;
  weekActiveDays: number;
}

function Bar({ value, goal }: { value: number; goal: number }) {
  const pct = goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function GoalsPanel({
  daily,
  weekly,
  onDaily,
  onWeekly,
  todayCount,
  weekCount,
  weekActiveDays,
}: Props) {
  return (
    <section className="panel p-5" aria-labelledby="goals-heading">
      <div className="flex items-center gap-2">
        <Target className="size-4 text-primary" aria-hidden />
        <h2 id="goals-heading" className="text-sm font-semibold">
          Goals
        </h2>
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="daily-goal" className="text-muted-foreground">
              Today
            </label>
            <span className="font-mono tabular-nums">
              {todayCount} / {daily}
            </span>
          </div>
          <div className="mt-2">
            <Bar value={todayCount} goal={daily} />
          </div>
          <input
            id="daily-goal"
            type="range"
            min={1}
            max={20}
            value={daily}
            onChange={(e) => onDaily(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--primary)]"
            aria-label="Daily activity goal"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between text-sm">
            <label htmlFor="weekly-goal" className="text-muted-foreground">
              This week
            </label>
            <span className="font-mono tabular-nums">
              {weekCount} / {weekly}
            </span>
          </div>
          <div className="mt-2">
            <Bar value={weekCount} goal={weekly} />
          </div>
          <input
            id="weekly-goal"
            type="range"
            min={5}
            max={100}
            step={5}
            value={weekly}
            onChange={(e) => onWeekly(Number(e.target.value))}
            className="mt-3 w-full accent-[var(--primary)]"
            aria-label="Weekly activity goal"
          />
        </div>

        <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
          Goals measure <span className="text-foreground">weighted engineering activity</span> —
          reviews, releases and pull requests count more than raw pushes. {weekActiveDays} active
          day{weekActiveDays === 1 ? "" : "s"} so far this week.
        </p>
      </div>
    </section>
  );
}
