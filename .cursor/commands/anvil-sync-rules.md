# Sync ANVIL Rules

Synchronise this repository with the canonical policy source `Bruteforce-Group/cursor-rules@main`.

1. Read the canonical repository version and current commit.
2. Preserve repository-specific additive rules and unrelated work.
3. Update generated Cursor rules, commands, `AGENTS.md` adapters, and the canonical lock manifest using the repository's Team Foundry/ANVIL sync mechanism.
4. Run the rule-version, link, lint, and drift checks.
5. Emit `cursor.governance.sync_completed` or `cursor.governance.sync_failed` through `https://portal.boz.dev/mcp` using `anvil_dispatch` → `anvil-event-ingest-mcp` → `events_ingest`.
6. Report exact files changed, canonical commit, validation state, and unresolved drift.

Do not overwrite stricter local policy. Do not transmit or request the mesh secret.
