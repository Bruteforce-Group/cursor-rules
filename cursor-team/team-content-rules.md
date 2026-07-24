# ANVIL Organisation Rules

This organisation uses `Bruteforce-Group/cursor-rules@main` as the canonical policy source and `Bruteforce-Group/team-foundry` as the Git-backed distribution layer.

Before changing code or reviewing a pull request:

1. Read repository `AGENTS.md` and `.cursor/rules/**`.
2. Follow canonical autonomous, security, testing, documentation, deployment, and ANVIL logging requirements.
3. Treat local repository rules as additive or stricter; do not silently weaken canonical policy.
4. Connect to ANVIL externally only through `https://portal.boz.dev/mcp` using CF Access service-token headers (not browser OAuth / `mcp-remote` / `oauth.portal.boz.dev`).
5. Send meaningful lifecycle, review, security, approval, governance, and deployment outcomes with repository, PR/run, and commit correlation.
6. Preserve production, destructive, identity, legal, financial, cross-tenant, secret, irreversible migration, and privilege-change approval gates.
7. Do not claim completion while required evidence is missing, stale, or failing.

## ANVIL event route

Use the configured portal MCP tool only:

```text
anvil_dispatch
  target: anvil-event-ingest-mcp
  command: events_ingest
```

Never call an internal hub hostname, component hostname, or mesh endpoint directly. Never request, expose, or transmit the ANVIL mesh secret.

Every meaningful result must identify one contributed consolidated check and its conclusion:

- `anvil/quality`
- `anvil/security`
- `anvil/approval`
- `anvil/governance`
- `anvil/deployment`

Include the canonical policy version and commit, current repository commit SHA, correlation ID, idempotency key, bounded findings, and durable evidence references. Do not transmit credentials, cookies, private keys, full environment dumps, or unredacted secret findings.

Cursor agents are the preferred CI and review execution layer. GitHub remains the source ledger and merge-enforcement boundary. Retire GitHub Actions only after an equivalent Cursor and ANVIL path publishes a required GitHub check and has demonstrated both success-path and failure-path parity.
