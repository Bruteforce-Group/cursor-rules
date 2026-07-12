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

Emit `cursor.governance.audit_completed` with findings, severity, evidence, and recommended remediation through the ANVIL portal.
