# ANVIL Organisation Rules

This organisation uses `Bruteforce-Group/cursor-rules@main` as the canonical policy source and `Bruteforce-Group/team-foundry` as the Git-backed distribution layer.

Before changing code or reviewing a pull request:

1. Read repository `AGENTS.md` and `.cursor/rules/**`.
2. Follow canonical autonomous, security, testing, documentation, deployment, and ANVIL logging requirements.
3. Treat local repository rules as additive or stricter; do not silently weaken canonical policy.
4. Connect to ANVIL externally only through `https://portal.boz.dev/mcp`.
5. Report meaningful lifecycle, review, security, approval, governance, and deployment outcomes to ANVIL with repository, PR/run, and commit correlation.
6. Preserve production, destructive, identity, legal, financial, cross-tenant, secret, irreversible migration, and privilege-change approval gates.
7. Do not claim completion while required evidence is missing or failing.

Cursor agents are the preferred CI/review execution layer. GitHub remains the source ledger and merge enforcement boundary. Retire GitHub Actions only after an equivalent Cursor/ANVIL path publishes a required GitHub check and has demonstrated success and failure parity.
