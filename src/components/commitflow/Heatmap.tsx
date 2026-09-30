import { useMemo } from "react";
import type { DayBucket } from "@/lib/activity";
import { heatLevel } from "@/lib/activity";

const LEVEL_CLASS = ["bg-heat-0", "bg-heat-1", "bg-heat-2", "bg-heat-3", "bg-heat-4"] as const;

export function Heatmap({ days }: { days: DayBucket[] }) {
  const { columns, max } = useMemo(() => {
    const max = days.reduce((m, d) => Math.max(m, d.count), 0);
    // Pad so the first column starts on Monday.
    const lead = (days[0]?.date.getDay() ?? 1) === 0 ? 6 : (days[0]?.date.getDay() ?? 1) - 1;
    const cells: (DayBucket | null)[] = [...Array<null>(lead).fill(null), ...days];
    const columns: (DayBucket | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) columns.push(cells.slice(i, i + 7));
    return { columns, max };
  }, [days]);

  const monthLabels = columns.map((col, i) => {
    const first = col.find(Boolean);
    if (!first) return "";
    const prev = columns[i - 1]?.find(Boolean);
    if (i === 0 || (prev && prev.date.getMonth() !== first.date.getMonth()))
      return first.date.toLocaleDateString(undefined, { month: "short" });
    return "";
  });

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[620px]">
        <div className="mb-1 flex gap-[3px] pl-8">
          {monthLabels.map((label, i) => (
            <div key={i} className="w-[13px] text-[10px] text-muted-foreground">
              {label}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="flex w-8 flex-col gap-[3px] pr-1 text-[10px] text-muted-foreground">
            {["Mon", "", "Wed", "", "Fri", "", ""].map((d, i) => (
              <div key={i} className="h-[13px] leading-[13px]">
                {d}
              </div>
            ))}
          </div>
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {Array.from({ length: 7 }).map((_, ri) => {
                const day = col[ri] ?? null;
                if (!day) return <div key={ri} className="size-[13px]" />;
                const level = heatLevel(day.count, max);
                return (
                  <div
                    key={ri}
                    tabIndex={0}
                    role="img"
                    title={`${day.date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} — ${day.count} activity point${day.count === 1 ? "" : "s"}`}
                    aria-label={`${day.date.toDateString()}: ${day.count} activity points`}
                    className={`size-[13px] rounded-[3px] ${LEVEL_CLASS[level]} ring-offset-2 ring-offset-background transition-transform hover:scale-125`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>Public activity, last 13 weeks</span>
          <span className="flex items-center gap-1.5">
            Less
            {LEVEL_CLASS.map((c) => (
              <span key={c} className={`size-[11px] rounded-[3px] ${c}`} />
            ))}
            More
          </span>
        </div>
      </div>
    </div>
  );
}
