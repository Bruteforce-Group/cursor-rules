# AGENTS.md

## Cursor Cloud specific instructions

This repo is the canonical Cursor rules source (`.cursor/rules/*.mdc`) plus a
self-managed documentation site (plain Markdown in `docs/` built to a static
site and deployed to Cloudflare Workers Static Assets). There is no compiled
app server — the "application" is the docs static site.

### Services / dev tasks

- **Docs site (the app):** build with `python3 scripts/build_docs.py` (output in
  the gitignored `site/`), then serve locally with `npx --yes wrangler@latest dev`
  (defaults to `http://localhost:8787`). `wrangler dev` runs fully locally and
  does not need Cloudflare auth. Deploying (`wrangler deploy`, only on `main` via
  `.github/workflows/docs.yml`) requires the `CLOUDFLARE_API_TOKEN` repo secret.
- **Lint:** `bash scripts/lint.sh` (rule frontmatter + YAML/JSON/Markdown checks;
  shellcheck runs on `scripts/*.sh`).
- **Version governance:** `bash scripts/check_rule_versions.sh` (VERSION vs `.mdc`
  frontmatter vs `.governance/versions.json` must all match).
- **Tests:** `cd scripts && python3 -m unittest test_memory_soft_delete` (the
  test imports `memory_soft_delete` from the same dir, so run it from `scripts/`).

### Non-obvious gotchas

- Python is Ubuntu's externally-managed 3.12, so pip needs
  `--break-system-packages` (it installs to `~/.local`). This is handled by the
  update script.
- `build_docs.py` rewrites relative `.md` links to extensionless clean URLs
  (e.g. `/usage`) to match Cloudflare Static Assets. Plain `python3 -m http.server`
  will 404 on those; use `wrangler dev` for a faithful local preview (it also
  serves the `404.html` not-found page).
- `scripts/lint.sh` skips shellcheck gracefully if it is not installed. For full
  shell linting install it with `apt-get install -y shellcheck` (kept out of the
  update script since it is a system package).
- Optional git hooks live in `.githooks/` (enable with
  `git config core.hooksPath .githooks`); the pre-commit hook auto-bumps rule
  versions when `.cursor/rules/`, `VERSION`, or `README.md` change.
