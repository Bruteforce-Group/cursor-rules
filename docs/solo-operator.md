---
title: "Single-operator mode"
description: "How solo-operator.mdc overrides team-oriented rules while keeping security and CI gates."
---

## Purpose

Boz operates as a **single operator** — one person, typically one active Cursor session. The repo ships team-oriented rules (`anvil-stack.mdc`, `autonomous-development-lifecycle.mdc`, `anvil-task-system.mdc`, and others) written for multi-session coordination incidents.

`solo-operator.mdc` is an **always-applied companion override**. When team workflow rules conflict with solo operation, **solo-operator wins**. Do not edit ANVIL-sourced rule bodies to reflect solo mode — update `solo-operator.mdc` instead.

## What is relaxed

| Area | Team default | Solo override |
| --- | --- | --- |
| Session leases | Mandatory before editing hub/pulse components | Optional unless parallel sessions |
| Branch-per-session | Never edit `main` directly | Recommended; trivial fixes on `main` OK with approval |
| ClickUp / ATOB | Every non-trivial task → INTAKE ticket | Skip for trivial work; required for substantial/deploy/legal work |
| Response contract | Tabulated Status/Build/Delta on every reply | Optional for casual turns; required for deploys/merges/incidents |
| PR review | External reviewer required | Boz is the reviewer; self-merge when approved + CI green |

## What stays mandatory

- Security: no secrets in code, fail-closed auth, safety gates (financial, identity, legal, irreversible)
- CI green before merge
- SDK-first engineering rules (Rules 1–5)
- Documentation sync in the same session as behavior changes
- No force-push to `main` without explicit request
- Forward deploy via CI (not routine local `wrangler deploy`)
- Self-verification before reporting done

## Cloud agents

Cursor cloud agents should follow solo-operator conventions:

1. **Branches:** `cursor/<intent>-f909` (cloud task convention)
2. **Git push only:** The Cursor Cloud GitHub integration **cannot** update PRs, add labels, approve, or merge. Attempts return:
   ```
   GraphQL: Resource not accessible by integration (updatePullRequest)
   ```
3. **Auto-ship:** Push to a `cursor/**` branch and open a PR. When the change is low-risk (docs, rules, README, workflows in approved scope), [Cursor Agent Auto Ship](../.github/workflows/cursor-agent-auto-ship.yml) auto-approves and squash-merges after CI passes — no agent-side PR API calls needed.
4. **Draft PRs:** The auto-ship workflow marks draft `cursor/**` PRs ready for review, then ships on the follow-up event.
5. **Manual fallback:** Comment `/ship` on the PR (repo OWNER/MEMBER/COLLABORATOR) to squash-merge immediately.
6. **Non-cursor branches:** Add label `automerge:low-risk` to trigger [Low Risk Auto Ship](../.github/workflows/low-risk-auto-ship.yml).
7. **Full GitHub API access:** Add `GH_PAT` Runtime Secret to Cursor Cloud Environment (not `GH_TOKEN` — Cursor may override that name) — [setup guide](cursor-github-integration.md). Rebuild the environment and start a **new** cloud agent run to load the secret.
8. **Verify:** run `./scripts/verify-github-agent-permissions.sh` in a cloud agent session.
9. **Leases:** Skip `cove-session-leases` unless parallel sessions target the same component

## Sync to user-level rules

After changing `solo-operator.mdc`, sync to `~/.cursor/rules/`:

```bash
./scripts/sync-to-user-rules.sh --force
```

Verify it is listed as always-apply:

```bash
./scripts/sync-to-user-rules.sh --list | grep solo-operator
```

## Related rules

- `solo-operator.mdc` — canonical override (this repo)
- `anvil-stack.mdc` — team coordination (lease, branch-per-session, response contract)
- `autonomous-development-lifecycle.mdc` — full lifecycle + completion report
- `anvil-task-system.mdc` — ATOB lanes and safety gates
