---
title: Cursor Team Playwright setup
description: Apply the canonical Team Content, commands, Bugbot, Security, and Approval configurations through an authenticated Cursor dashboard.
---

## Purpose

The Cursor Admin API does not currently expose a documented write surface for Team Content, Bugbot Team Rules, Security Agent configuration, or Approval Agent configuration. The repository therefore includes a local Playwright configurator under `automation/cursor-team-playwright/`.

The configurator reads `cursor-team/manifest.json` and applies the versioned files directly. It uses a dedicated persistent browser profile and requires an explicit `--apply` flag before changing anything.

## Run a discovery pass

```bash
cd automation/cursor-team-playwright
npm install
npm run install-browser
npm run dry-run
```

Complete Cursor and Cloudflare authentication in the Chrome window. Review the screenshots and `report.json` under the generated `artifacts/` directory.

## Apply the configuration

```bash
npm run setup -- --apply --headed
```

The run configures Team Content Rules, commands, Bugbot Team Rules, Vulnerability Scanner, Security Reviewer, and the Pull Request Router and Approver.

## Evidence and API discovery

The configurator records redacted XHR and fetch URLs in `network.jsonl`. This helps identify stable Cursor write endpoints that can later be promoted into typed `anvil-cursor-mcp` tools. Request bodies, cookies, authorization headers, and secret query values are not recorded.

## Failure handling

Dashboard markup is not a stable public contract. The script uses semantic labels and multiple route candidates from `ui-map.json`. If a section cannot be located, it captures a failure screenshot, records the error, continues to the remaining sections, and exits non-zero.
