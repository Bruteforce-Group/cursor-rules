---
title: Cursor Team rollout
description: Apply and verify the canonical Cursor Team rules, commands, review agents, ANVIL event route, and consolidated check contract.
---

## Source package

Use `cursor-team/manifest.json` as the machine-readable inventory. The policy authority is `Bruteforce-Group/cursor-rules@main`; `Bruteforce-Group/team-foundry` is the Git-backed distribution layer.

External Cursor clients connect to ANVIL only through:

```text
https://portal.boz.dev/mcp
```

The event route is:

```text
anvil_dispatch
  target: anvil-event-ingest-mcp
  command: events_ingest
```

Do not configure an internal hub hostname, component hostname, or mesh endpoint in Cursor.

## Apply in Cursor Team

Use the Cursor Team dashboard when a supported write API is unavailable.

1. Apply **Team Content Rules** from `cursor-team/team-content-rules.md`.
2. Add the commands from `.cursor/commands/`.
3. Apply **Bugbot Team Rules** from `cursor-team/bugbot-team-rules.md`.
4. Configure **Vulnerability Scanner** from `cursor-team/vulnerability-scanner.md`.
5. Configure **Security Reviewer** from `cursor-team/security-reviewer.md`.
6. Configure **Pull Request Router and Approver** from `cursor-team/approval-agent.md`.
7. Confirm the ANVIL MCP points to `https://portal.boz.dev/mcp`.
8. Keep agent credentials in the platform secret store; never paste credentials into rules, prompts, comments, or event payloads.

## Required event envelope

Each meaningful agent run sends a bounded event for the exact repository commit:

```json
{
  "source": "cursor-security-reviewer",
  "event_type": "cursor.security.completed",
  "detail": "Security review completed for the current pull-request commit",
  "correlation_id": "cursor:owner/repo:123:commit-sha",
  "idempotency_key": "security-reviewer:owner/repo:commit-sha:1.7.1",
  "payload": {
    "repository": "owner/repo",
    "pull_request": 123,
    "commit_sha": "commit-sha",
    "check_name": "anvil/security",
    "policy_repo": "Bruteforce-Group/cursor-rules",
    "policy_version": "1.7.1",
    "conclusion": "success",
    "severity": "info",
    "findings": [],
    "evidence": []
  }
}
```

Redact secrets and bound diagnostics. Prefer durable evidence references over full logs.

## Consolidated checks

ANVIL owns these commit checks:

- `anvil/quality`
- `anvil/security`
- `anvil/approval`
- `anvil/governance`
- `anvil/deployment`

Agents contribute evidence; they do not publish success when required evidence is missing or stale. GitHub rulesets remain the merge-enforcement boundary.

## Acceptance matrix

Complete the following before retiring an equivalent GitHub Actions job:

| Path | Required evidence |
|---|---|
| Quality success | Changed-code run passes lint, typecheck, tests, and build for the exact SHA |
| Quality failure | Deliberate failing test or validation produces `anvil/quality` failure |
| Security success | Clean review produces fresh evidence for the exact SHA |
| Security failure | Controlled high-severity fixture produces `anvil/security` failure and ANVIL triage |
| Approval success | All current-SHA evidence is present and the approval agent approves |
| Approval stale | A new commit invalidates old evidence and blocks approval |
| Governance drift | Missing or weakened canonical rule produces `anvil/governance` failure |
| Deployment | Dry-run success and controlled failure are both recorded before production cutover |

Require at least three representative runs, including a changed-code success and a failure path, before removing duplicate GitHub Actions. Preserve release provenance, signing, platform-specific tests, and deployment recovery jobs until equivalent evidence exists.

## Repository validation

Run from the repository root:

```bash
python3 scripts/validate_cursor_team.py
bash scripts/lint.sh
bash scripts/check_rule_versions.sh
```

The validator checks manifest references, required commands and templates, the portal-only boundary, exact event routing, consolidated checks, and policy-version consistency.
