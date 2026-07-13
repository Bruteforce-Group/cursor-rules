---
title: "CI & deploy"
description: "How the self-managed documentation pipeline validates, builds, and deploys to Cloudflare."
---

The documentation pipeline is fully self-managed in this repo. There is no
third-party docs service — just a checker, a generator, and a Cloudflare
Workers deploy, all defined in `.github/workflows/docs.yml`.

## What runs

| Trigger | Steps |
| --- | --- |
| Pull request (docs/scripts/config changed) | link check → build (no deploy) |
| Push to `main` | link check → build → deploy to Cloudflare |

The steps are:

1. **Link check** — `python3 scripts/check_docs_links.py` validates internal
   links, anchors, image assets, and required frontmatter. It fails the build
   on any broken reference.
2. **Build** — `python3 scripts/build_docs.py` renders `docs/*.md` into static
   HTML under `site/`.
3. **Deploy** — `npx wrangler deploy` uploads `site/` as a Workers Static
   Assets deployment.

## Deploy configuration

`wrangler.jsonc` defines an assets-only Worker:

```jsonc
{
  "name": "bozza-docs",
  "compatibility_date": "2026-05-30",
  "assets": { "directory": "./site", "not_found_handling": "404-page" }
}
```

Deploys require a `CLOUDFLARE_API_TOKEN` repository secret and the account ID in
`wrangler.jsonc`. The site is served at **https://docs.boz.dev** (custom domain,
provisioned automatically on deploy) and also on the Worker's `*.workers.dev` URL.

## Common failures

- **Broken link reported:** fix the link or add the missing page/asset, then
  re-run `python3 scripts/check_docs_links.py` locally.
- **Missing frontmatter:** every nav page needs `title` and `description`.
- **Deploy auth error:** confirm the `CLOUDFLARE_API_TOKEN` secret is set and
  has Workers edit permission.

## Run it locally

```bash
pip install -r requirements-docs.txt
python3 scripts/check_docs_links.py
python3 scripts/build_docs.py
```

## Cursor Cloud agent PR permissions

Cursor Cloud agents use a GitHub integration token with **read + git push** only. They **cannot**:

- Update PR title/body (`ManagePullRequest` update → `updatePullRequest` error)
- Add labels, comment, approve, or merge via `gh` CLI
- Trigger `workflow_dispatch`

**Workaround (solo-operator):** push to a `cursor/**` branch. [Cursor Agent Auto Ship](../.github/workflows/cursor-agent-auto-ship.yml) runs on `pull_request_target`, evaluates low-risk file scope, auto-approves, waits for required checks, then squash-merges. If GitHub auto-merge is disabled on the repo, the workflow falls back to a direct `gh pr merge --squash`. Manual fallback: comment `/ship` on the PR.

**Required checks on workflow-only PRs:** `lint` and `check-versions` trigger on `.github/workflows/**` changes so workflow edits are not merged without governance validation.

**Full fix:** add `GH_PAT` (Runtime Secret — not `GH_TOKEN`, which Cursor may override with its installation token) to the Cursor Cloud Environment — see [Cursor GitHub integration](cursor-github-integration.md). Rebuild the environment and **start a new cloud agent run** to pick up the secret.

See [Single-operator mode](solo-operator.md) for the full cloud-agent workflow table.
