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

Deploys require a `CLOUDFLARE_API_TOKEN` repository secret (Workers Scripts
edit permission) and the account ID in `wrangler.jsonc`. Until a custom domain
is attached, the site is served from the Worker's `*.workers.dev` URL.

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
