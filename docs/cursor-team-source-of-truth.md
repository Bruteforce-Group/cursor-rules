---
title: Cursor Team source of truth
description: Configure Cursor Team and repositories to consume the canonical Bruteforce-Group cursor-rules repository.
---

## Canonical repository

Use `Bruteforce-Group/cursor-rules`, protected branch `main`, as the organisation-wide governance authority.

The canonical rules live in `.cursor/rules/`. Project repositories keep only project-specific additions and must not fork canonical rule bodies.

## Team configuration

Configure Cursor Team to use the canonical GitHub repository and branch. Restrict administration to Boz and require repository access through the installed GitHub App.

Recommended settings:

| Setting | Value |
|---|---|
| Repository | `Bruteforce-Group/cursor-rules` |
| Branch | `main` |
| Rules path | `.cursor/rules` |
| Update mode | Track protected branch |
| Operator model | Solo operator |
| Default agent mode | Autonomous orchestration |
| Project overrides | Additive or stricter only |
| Drift reporting | ANVIL |

## Repository onboarding

Each repository should retain an `AGENTS.md` describing commands, architecture, secrets policy, platform limitations, and deployment rules. Canonical governance comes from the Team rule source.

Local sessions can synchronise the same rules with:

```bash
bash scripts/sync-to-user-rules.sh --force
```

## Validation

Before rollout, run:

```bash
bash scripts/lint.sh
bash scripts/check_rule_versions.sh
cd scripts && python3 -m unittest test_memory_soft_delete
```

Downstream repositories should record the canonical commit SHA and detect drift in CI.

## Exceptions

Document any exception with owner, rationale, risk, scope, and review or expiry date. Security, secrets, hard safety gates, ANVIL logging, and CI deployment discipline cannot be weakened by a silent project override.
