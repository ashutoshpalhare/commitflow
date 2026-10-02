import { Github, Search, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { USERNAME_RE } from "@/lib/github";

interface Props {
  value: string;
  onSubmit: (login: string) => void;
  recent: string[];
  onClearRecent: () => void;
  busy?: boolean;
}

export function UserSearch({ value, onSubmit, recent, onClearRecent, busy }: Props) {
  const [draft, setDraft] = useState(value);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => setDraft(value), [value]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const clean = draft
      .trim()
      .replace(/^@/, "")
      .replace(/^https?:\/\/github\.com\//i, "")
      .split("/")[0];
    if (!clean) return;
    // Reject impossible usernames locally instead of spending a rate-limited request.
    if (!USERNAME_RE.test(clean)) return setInvalid(true);
    setInvalid(false);
    onSubmit(clean);
  }

  return (
    <div className="w-full">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Github
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setInvalid(false);
            }}
            aria-invalid={invalid}
            aria-describedby={invalid ? "username-error" : undefined}
            placeholder="GitHub username"
            aria-label="GitHub username"
            autoComplete="off"
            spellCheck={false}
            className="h-11 w-full rounded-lg border border-border bg-surface pl-9 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search className="size-4" aria-hidden />
          {busy ? "Loading…" : "Analyze"}
        </button>
      </form>
      {invalid && (
        <p id="username-error" role="alert" className="mt-2 text-xs text-destructive">
          That isn&rsquo;t a valid GitHub username (letters, numbers and single hyphens, max 39).
        </p>
      )}

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Recent</span>
          {recent.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onSubmit(r)}
              className="rounded-md border border-border bg-surface px-2.5 py-1 font-mono text-xs text-muted-foreground panel-hover hover:text-foreground"
            >
              {r}
            </button>
          ))}
          <button
            type="button"
            onClick={onClearRecent}
            aria-label="Clear recent searches"
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" aria-hidden /> clear
          </button>
        </div>
      )}
    </div>
  );
}
