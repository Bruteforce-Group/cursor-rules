# Cursor Team Playwright configurator

This tool applies the versioned Cursor Team package from the repository through an authenticated Cursor dashboard session.

It configures:

- **Cloud Environment Runtime Secrets** (e.g. `GH_PAT` for full GitHub PR API in cloud agents)
- Team Content Rules
- the four ANVIL commands
- Bugbot Team Rules
- Vulnerability Scanner
- Security Reviewer
- Pull Request Router and Approver

The tool reads `cursor-team/manifest.json`; it does not duplicate policy bodies.

## Install

```bash
cd automation/cursor-team-playwright
npm install
npm run install-browser
```

On macOS, the default browser channel is the installed Google Chrome. A dedicated persistent profile is stored at `~/.anvil/cursor-team-playwright-profile`, so the automation never reads or modifies your normal Chrome profile.

## Discover without writing

```bash
npm run dry-run
```

A visible browser opens. Complete Cursor and Cloudflare authentication in that window. The script discovers the dashboard sections (including Cloud → Environments → Secrets), captures screenshots and records redacted XHR/fetch metadata without changing settings.

## Apply GH_PAT only (Cloud Environment)

```bash
export GH_PAT=github_pat_xxxxxxxx   # or use --runtime-secret-file
export CURSOR_CLOUD_ENVIRONMENT="cursor-rules"   # name shown in Cursor dashboard

npm run setup -- --apply --headed --cloud-only \
  --environment-name "$CURSOR_CLOUD_ENVIRONMENT"
```

This upserts the `GH_PAT` Runtime Secret and clicks **Rebuild** so the next cloud agent run picks up the token. **Start a new agent run** after rebuild — continuing an existing run does not reload secrets.

Prefer `--runtime-secret-file` over shell export when the token would appear in process listings:

```bash
npm run setup -- --apply --headed --cloud-only \
  --environment-name "cursor-rules" \
  --runtime-secret-file ~/.config/cursor/gh_pat.env
```

## Apply the full Team package

```bash
npm run setup -- --apply --headed
```

Every configuration item is upserted from the canonical files. Results, screenshots and redacted network metadata are written under `automation/cursor-team-playwright/artifacts/<timestamp>/`.

Useful options:

```text
--profile-dir PATH
--base-url URL
--timeout-ms 600000
--slow-mo 75
--keep-open
--headless
--channel chrome|chromium
--environment-name NAME
--runtime-secret-name GH_PAT
--runtime-secret-file PATH
--skip-cloud-environment
--cloud-only
--skip-rebuild
```

## Safety

- No Cursor password, cookie, API key or ANVIL secret is read from repository files.
- Runtime secret values are loaded only from `--runtime-secret-file` or the named environment variable at apply time.
- Reports store a SHA-256 digest of the secret, never the plaintext value.
- The persistent profile is local and ignored by git.
- Network metadata redacts sensitive query parameters and does not store request bodies or headers.
- `--apply` is required for any mutation.
- The script continues across sections and produces a complete failure report instead of claiming partial work succeeded.

Cursor dashboard markup is not a public API. If Cursor changes labels or routes, update `ui-map.json` and rerun dry-run before applying.
