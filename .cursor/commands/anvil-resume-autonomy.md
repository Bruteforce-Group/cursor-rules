# Resume Full Autonomous Mode

Resume all previously authorised, safe, repository-scoped workstreams under the canonical ANVIL autonomous rules.

- Re-check branch, worktree, PR, CI, Cursor agent, and ANVIL event state for drift.
- Continue routine implementation, testing, documentation, review repair, and CI remediation without repeated approval.
- Preserve all production, destructive, identity, legal, financial, cross-tenant, secret, irreversible migration, and privilege-change gates.
- Pause only for a genuine classified blocker and consolidate decisions into one Autonomous Pause Report.

Publish `cursor.autonomy.resumed` through `https://portal.boz.dev/mcp` using:

```text
anvil_dispatch
  target: anvil-event-ingest-mcp
  command: events_ingest
```

Include active workstreams, repository, current commit SHA, policy version, correlation ID, and idempotency key. Attribute any check work to `anvil/quality`, `anvil/security`, `anvil/approval`, `anvil/governance`, or `anvil/deployment` as applicable.

Never call a component hostname or internal mesh endpoint directly. Never request or transmit the mesh secret.
