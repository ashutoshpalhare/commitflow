import { Check, ExternalLink, Compass } from "lucide-react";
import type { FocusSuggestion } from "@/lib/activity";

interface Props {
  items: FocusSuggestion[];
  done: string[];
  onToggle: (id: string) => void;
}

export function TodaysFocus({ items, done, onToggle }: Props) {
  return (
    <section className="panel p-5" aria-labelledby="focus-heading">
      <div className="flex items-center gap-2">
        <Compass className="size-4 text-accent" aria-hidden />
        <h2 id="focus-heading" className="text-sm font-semibold">
          Today&rsquo;s Focus
        </h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Suggested from real repository signals — no filler commits.
      </p>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Nothing pressing surfaced. Pick the hardest thing you&rsquo;ve been avoiding.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((item) => {
            const isDone = done.includes(item.id);
            return (
              <li
                key={item.id}
                className={`rounded-lg border border-border p-3 transition-colors ${isDone ? "opacity-55" : "hover:border-border-strong"}`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => onToggle(item.id)}
                    aria-pressed={isDone}
                    aria-label={`Mark "${item.title}" as ${isDone ? "not done" : "done"}`}
                    className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                      isDone
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border-strong hover:border-primary"
                    }`}
                  >
                    {isDone && <Check className="size-3.5" aria-hidden />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {item.kind}
                      </span>
                      <h3
                        className={`text-sm font-medium ${isDone ? "line-through decoration-muted-foreground" : ""}`}
                      >
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.detail}
                    </p>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline"
                      >
                        {item.repo}
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
