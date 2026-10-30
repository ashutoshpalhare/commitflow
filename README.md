# CommitFlow

CommitFlow is a GitHub activity and repository-insights dashboard for public GitHub accounts. Enter a GitHub username to explore recent public activity, contribution patterns, repository health signals, and practical maintenance suggestions—all from a client-side web app.

> **Data scope:** CommitFlow uses GitHub's public REST API without user authentication. It cannot access private repositories or private activity, and it does not make changes to GitHub.

## Features

### Public profile and repository overview

- Look up a GitHub account by username.
- Display public profile information and repository statistics.
- Fetch repositories owned by the selected account and sort them by recent push activity.
- Review repository metadata such as language, stars, forks, issues, license, topics, and last push time.
- Handle GitHub API errors, including missing users, network failures, and rate-limit responses.

The repository fetcher follows pagination and caps the scan at five pages (up to 500 repositories) to keep request usage bounded.

### Activity feed and contribution heatmap

- Read public user events from GitHub's public events endpoint.
- Show a recent activity feed based on the events GitHub makes available.
- Build a **91-day** activity heatmap.
- Weight selected event types differently—for example, pushes use commit counts where available, while pull requests and releases receive their own weights.
- Summarize current and longest activity streaks.
- Aggregate activity into weekly trend buckets.

The heatmap is an event-based estimate, not a replica of GitHub's private contribution graph. GitHub's public events endpoint is limited and does not expose every action or private contribution.

### Repository health signals

CommitFlow calculates a lightweight heuristic health score using public metadata, including:

- Time since the latest push.
- Whether the repository has a description.
- Whether a license is detected.
- Whether repository topics are configured.
- Issue and star signals.

It also labels repositories as Active, Steady, Cooling, Dormant, or Archived. These labels are project-maintenance hints, not an authoritative quality or security assessment.

### Suggested next actions

A focus panel turns repository metadata and activity patterns into practical suggestions, such as:

- Add a repository description or topics.
- Add a license where appropriate.
- Review stale repositories.
- Triage open issues.
- Add tests around risky code.
- Review accessibility.
- Prefer reviewable pull requests over repeated direct pushes to the default branch.

Suggestions are generated from public metadata and simple rules. They are not AI-generated and do not inspect the repository's source code.

## Data and API behaviour

CommitFlow reads public endpoints from `https://api.github.com`, including:

- `GET /users/{username}`
- `GET /users/{username}/repos`
- `GET /users/{username}/events/public`

No GitHub token is requested or stored by the current API client.

Because requests are unauthenticated:

- GitHub's unauthenticated rate limits apply.
- Private repositories and private user activity are unavailable.
- Public events may be incomplete or older events may no longer be available from the endpoint.
- The dashboard can only calculate insights from the metadata and events returned by GitHub at request time.

## Tech stack

| Area | Technology |
| --- | --- |
| UI | React 19, TypeScript |
| Routing / app framework | TanStack React Router, TanStack Start |
| Build tooling | Vite |
| Styling | Tailwind CSS 4 |
| UI primitives | Radix UI-based components |
| Charts / visualizations | Recharts and custom heatmap components |
| Icons | Lucide React |
| Data source | GitHub REST API (public endpoints) |

## Project structure

```text
.
├── src/
│   ├── components/
│   │   └── commitflow/
│       ├── ActivityFeed.tsx
│       ├── GoalsPanel.tsx
│       ├── Heatmap.tsx
│       ├── RepoList.tsx
│       ├── StatTile.tsx
│       ├── TodaysFocus.tsx
│       ├── UserSearch.tsx
│       └── WeeklyTrend.tsx
│   ├── lib/
│   │   ├── activity.ts
│   │   └── github.ts
│   ├── routes/
│   └── styles.css
├── scripts/
│   └── pages-shell.mjs
├── package.json
└── vite.config.ts
```

Core API access and error handling live in `src/lib/github.ts`. Activity aggregation, streak calculations, repository-health scoring, and focus suggestions live in `src/lib/activity.ts`.

## Getting started

### Prerequisites

- [Bun](https://bun.sh/) (recommended; the repository includes `bun.lock`)
- Git

### Install and run locally

```bash
git clone https://github.com/ashutoshpalhare/CommitFlow.git
cd CommitFlow
bun install
bun run dev
```

Vite prints the local development URL in the terminal.

### Build and quality scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Start the development server |
| `bun run build` | Create the standard production build |
| `bun run build:dev` | Build using development mode |
| `bun run build:pages` | Build the static GitHub Pages output under `dist/client` |
| `bun run preview` | Preview a production build locally |
| `bun run lint` | Run ESLint |
| `bun run format` | Format project files with Prettier |

The GitHub Pages build runs `GITHUB_PAGES=1 vite build` and then executes `scripts/pages-shell.mjs` to write the static `index.html`, `404.html`, and `.nojekyll` files. The Pages build uses the repository base path `/commitflow/`.

## Limitations

- Public GitHub data only; there is no OAuth sign-in or private-repository access.
- The app is read-only and does not create commits, issues, releases, or pull requests.
- Activity and health calculations are heuristic summaries, not official GitHub metrics or repository audits.
- The public events endpoint is not a complete historical contribution data source.
- API rate limits can temporarily prevent fresh data from loading.

## Contributing

Focused bug reports and improvements are welcome. For changes to API handling or activity calculations, include tests for rate-limit behaviour, event weighting, date boundaries, and empty or partial API responses where practical.

## License

No license file is currently included. Unless a license is added, the repository is publicly viewable but reuse and redistribution are not automatically granted.
