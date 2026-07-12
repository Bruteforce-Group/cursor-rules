# Cursor + ANVIL internal CI migration

## Target

Cursor executes review, security, approval, remediation, and agent validation. ANVIL owns policy, durable events, correlation, triage, and consolidated GitHub checks. GitHub remains the source ledger, pull-request record, ruleset boundary, and release provenance store.

## Sequence

1. Apply Team Content Rules and Commands from this repository.
2. Apply Bugbot Team Rules.
3. Configure Vulnerability Scanner, Security Reviewer, and Pull Request Router and Approver with the versioned agent contracts in `cursor-team/`.
4. Verify all agents send correlated events through `https://portal.boz.dev/mcp`.
5. Enable ANVIL publication of `anvil/quality`, `anvil/security`, `anvil/approval`, `anvil/governance`, and `anvil/deployment` for the exact commit SHA.
6. Add those checks to GitHub organisation/repository rulesets.
7. Run Cursor/ANVIL and existing GitHub Actions in parallel for representative success and failure paths.
8. Remove duplicate review and security Actions first, then quality Actions after parity. Move production deployment last.

## Rollback

Re-enable the previous GitHub Actions workflow from git history, remove the affected required ANVIL check from the ruleset only if it cannot be restored promptly, and preserve all Cursor/ANVIL event evidence for incident review.

## Non-retirable GitHub responsibilities

Keep Git hosting and PR history, branch/ruleset enforcement, signed commit requirements, force-push/deletion protection, release tags, provenance, and any platform-specific job that Cursor/ANVIL cannot execute or evidence reliably.
