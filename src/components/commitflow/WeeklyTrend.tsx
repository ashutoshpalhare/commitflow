import { TrendingUp } from "lucide-react";
import type { DayBucket } from "@/lib/activity";
import { weeklyBuckets } from "@/lib/activity";

export function WeeklyTrend({ days }: { days: DayBucket[] }) {
  const weeks = weeklyBuckets(days);
  const max = Math.max(1, ...weeks.map((w) => w.total));
  const last = weeks[weeks.length - 1]?.total ?? 0;
  const prev = weeks[weeks.length - 2]?.total ?? 0;
  const delta = last - prev;

  return (
    <section className="panel p-5" aria-labelledby="trend-heading">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-accent" aria-hidden />
          <h2 id="trend-heading" className="text-sm font-semibold">
            Weekly trend
          </h2>
        </div>
        <span
          className={`font-mono text-xs tabular-nums ${delta > 0 ? "text-primary" : delta < 0 ? "text-warning" : "text-muted-foreground"}`}
        >
          {delta > 0 ? "+" : ""}
          {delta} vs prior 7 days
        </span>
      </div>

      <div className="mt-5 flex h-28 items-end gap-1.5">
        {weeks.map((w, i) => (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
            <div
              className="w-full rounded-t-sm bg-chart-1/70 transition-colors group-hover:bg-chart-1"
              style={{ height: `${Math.max(3, (w.total / max) * 100)}%` }}
              title={`Week of ${w.label}: ${w.total} points across ${w.days} active day(s)`}
              role="img"
              aria-label={`Week of ${w.label}: ${w.total} activity points, ${w.days} active days`}
            />
            <span className="text-[9px] text-muted-foreground">{w.dayOfMonth}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
