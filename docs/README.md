# Documentation workflow (docs.bozza.au)

This repository publishes documentation via `https://docs.bozza.au`. Use this folder to author Markdown/MDX content that will be pulled by the docs.bozza.au site.

## Authoring

- Write pages in Markdown or MDX under `docs/` with clear titles and short summaries in frontmatter.
- Organize by topic (e.g., `backend/`, `frontend/`, `infra/`) and prefer small, focused pages.
- Keep code snippets aligned with current rule files; update examples when rules change.

## Publishing

- In the docs.bozza.au dashboard, connect this repository and choose the default branch to publish.
- After merging doc changes to the connected branch, trigger a rebuild from the docs.bozza.au UI if automatic rebuilds are not enabled.
- Verify the published site at `https://docs.bozza.au` once the build completes.

## Navigation and linking

- Add or update index/landing pages for each section to link newly added docs.
- Cross-link related rule files and doc pages so readers can navigate from rules to deeper guidance.

