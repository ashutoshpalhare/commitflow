<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- GitHub Pages: `bun run build:pages` (GITHUB_PAGES=1) builds a static SPA under `/commitflow/` into `dist/client`; `scripts/pages-shell.mjs` renders index.html/404.html from the server bundle. Why: Pages is static-only, while the normal build stays SSR for Lovable hosting. Router basepath comes from `import.meta.env.BASE_URL`.
