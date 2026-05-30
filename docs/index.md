---
title: "Overview"
description: "Canonical Cursor rules plus a self-managed documentation site built from Markdown and deployed on Cloudflare."
---

This repository is the canonical source of truth for our Cursor AI rules. It
also publishes this documentation site, which is built from plain Markdown by a
small self-managed generator and deployed to Cloudflare Workers — no third-party
docs platform.

## What's here

- `.cursor/rules/`: rule files per domain (backend, frontend, infra, data, security, ANVIL, and cross-cutting standards).
- `docs/`: the Markdown source for this site, plus `nav.json` and the HTML theme.
- `scripts/build_docs.py`: renders `docs/*.md` into static HTML under `site/`.
- `scripts/check_docs_links.py`: validates internal links, anchors, and image assets.
- `.github/workflows/docs.yml`: builds and link-checks on PRs, then deploys on `main`.

## How the docs are managed

Everything is owned in this repo and enforced by CI:

1. Author pages as Markdown in `docs/` with `title` + `description` frontmatter.
2. Register each page in [`docs/nav.json`](usage.md) so it appears in the sidebar.
3. CI runs the link checker and the build on every pull request.
4. On merge to `main`, CI builds the site and deploys it to Cloudflare.

## Key behaviours

- Rules apply through Cursor's rule system based on the `globs` in each `.mdc`.
- Cross-cutting rules use `alwaysApply: true`; domain rules activate on matching files.
- The docs site is static HTML — fast, portable, and fully under our control.

Next: read [how to use the rules](usage.md) in your own project.
