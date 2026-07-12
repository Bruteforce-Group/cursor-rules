---
title: "Overview"
description: "Canonical Cursor rules, Cursor Team agent contracts, and a self-managed documentation site deployed on Cloudflare."
---

This repository is the canonical source of truth for Cursor AI governance across Bruteforce Group. It also publishes this documentation site, built from plain Markdown by a small self-managed generator and deployed to Cloudflare Workers.

## What's here

- `.cursor/rules/`: canonical rule files for ANVIL, autonomous execution, engineering domains, security, testing, documentation, and governance.
- `.cursor/commands/`: versioned operator commands for rule sync, governance audit, autonomy resume, and Cursor CI reporting.
- `cursor-team/`: Team Content, Bugbot, Security Agent, Approval Agent, and machine-readable manifest files.
- `docs/`: the Markdown source for this site, plus `nav.json` and the HTML theme.
- `scripts/validate_cursor_team.py`: validates the Cursor Team package and ANVIL event boundary.
- `scripts/build_docs.py`: renders `docs/*.md` into static HTML under `site/`.
- `scripts/check_docs_links.py`: validates internal links, anchors, and image assets.
- `.github/workflows/docs.yml`: builds and link-checks on pull requests, then deploys on `main`.

## How governance is distributed

1. `Bruteforce-Group/cursor-rules@main` is the protected policy authority.
2. Cursor Team consumes the versioned Team Content and agent contracts.
3. `Bruteforce-Group/team-foundry` provides the Git-backed distribution layer.
4. Project repositories add only project facts or stricter safeguards.
5. External agents enter ANVIL only through `https://portal.boz.dev/mcp`.
6. ANVIL correlates evidence and owns the consolidated GitHub checks.

## Key behaviours

- Cross-cutting rules use `alwaysApply: true`; domain rules activate on matching files.
- Cursor Bugbot, Security Agents, Approval Agents, and Cloud Agents contribute evidence for the exact commit SHA.
- ANVIL owns `anvil/quality`, `anvil/security`, `anvil/approval`, `anvil/governance`, and `anvil/deployment`.
- GitHub remains the source ledger and merge-enforcement boundary.
- GitHub Actions is retired only after equivalent Cursor and ANVIL success-path and failure-path parity.
- The docs site is static HTML, portable, and fully under our control.

Start with [using the rules](usage.md), then apply the [Cursor Team rollout](cursor-team-rollout.md).
