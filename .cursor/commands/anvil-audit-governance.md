# Audit ANVIL Governance

Audit the current repository against `Bruteforce-Group/cursor-rules@main` without changing files unless explicitly instructed.

Check:

- canonical source lock and version;
- required always-applied rules;
- Cursor commands and `AGENTS.md` routing;
- weakened or contradictory local overrides;
- GitHub ruleset and required ANVIL checks;
- enabled Cursor Bugbot, Security, and Approval agents;
- direct external calls that bypass `https://portal.boz.dev/mcp`;
- duplicate GitHub Actions that are eligible for retirement.

Publish `cursor.governance.audit_completed` or `cursor.governance.audit_failed` through the portal using:

```text
anvil_dispatch
  target: anvil-event-ingest-mcp
  command: events_ingest
```

Contribute to `anvil/governance`. Include repository, current commit SHA, canonical policy version and commit, findings, severity, evidence, missing or stale checks, recommended remediation, correlation ID, and idempotency key.

Never call a component hostname or internal mesh endpoint directly. Never request or transmit the mesh secret.
