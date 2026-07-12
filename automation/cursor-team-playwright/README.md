# Cursor Team Playwright configurator

This tool applies the versioned Cursor Team package from the repository through an authenticated Cursor dashboard session.

It configures:

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

A visible browser opens. Complete Cursor and Cloudflare authentication in that window. The script discovers the dashboard sections, captures screenshots and records redacted XHR/fetch metadata without changing settings.

## Apply the package

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
```

## Safety

- No Cursor password, cookie, API key or ANVIL secret is read from repository files.
- The persistent profile is local and ignored by git.
- Network metadata redacts sensitive query parameters and does not store request bodies or headers.
- `--apply` is required for any mutation.
- The script continues across sections and produces a complete failure report instead of claiming partial work succeeded.

Cursor dashboard markup is not a public API. If Cursor changes labels or routes, update `ui-map.json` and rerun dry-run before applying.
