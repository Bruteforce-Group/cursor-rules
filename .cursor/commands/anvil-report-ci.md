# Report Cursor CI Result

Publish the current Cursor agent run to ANVIL through `https://portal.boz.dev/mcp`.

Use `anvil_dispatch` with target `anvil-event-ingest-mcp` and command `events_ingest`.

Include:

- repository, PR, branch, and commit SHA;
- agent name and trigger;
- policy version and canonical policy commit;
- contributed consolidated check: `anvil/quality`, `anvil/security`, `anvil/approval`, `anvil/governance`, or `anvil/deployment`;
- conclusion and severity;
- bounded findings and evidence references;
- remediation performed or required;
- idempotency and correlation identifiers.

Never include raw credentials, access tokens, cookies, private keys, full environment dumps, or unredacted secret findings.
