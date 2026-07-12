# ANVIL Bugbot Team Rules

Apply these rules to every pull request in the organisation.

## Policy authority

The canonical engineering and agent policy is `Bruteforce-Group/cursor-rules@main`. Read repository-local generated rules and `AGENTS.md`; report missing or stale policy as a governance finding. Local rules may be stricter but may not silently weaken canonical requirements.

## Review priorities

Review for correctness, security, data safety, reliability, maintainability, test coverage, documentation accuracy, observability, deployment safety, and unintended scope expansion.

Treat the following as blocking unless evidence clearly shows otherwise:

- exposed credentials or sensitive data;
- authentication, authorisation, tenant-isolation, or privilege regressions;
- destructive or irreversible operations without explicit gates and rollback;
- production mutation from tests, local scripts, or unapproved automation;
- missing validation for changed behaviour;
- failing required tests, builds, type checks, migrations, or smoke checks;
- silent error handling, fabricated success, or swallowed deployment failures;
- direct external access to ANVIL components instead of `https://portal.boz.dev/mcp`;
- bypass of the ANVIL mesh or use of the mesh secret outside ANVIL;
- stale generated policy or weakened mandatory rules;
- undocumented infrastructure, API, schema, security, or behavioural changes.

## Engineering expectations

- Prefer official SDKs and typed interfaces over ad-hoc protocol code where practical.
- Keep changes scoped to the stated objective and preserve unrelated work.
- Require fail-closed authentication and least privilege.
- Require idempotency for retryable side effects.
- Require bounded, redacted diagnostics and correlation identifiers.
- Require tests at the narrowest useful layer plus repository-wide validation proportionate to risk.
- Require documentation and runbook updates in the same change as substantive behaviour or infrastructure changes.
- Do not block on style preferences already handled by automated formatters unless they impair correctness or clarity.

## Output

Leave concise, actionable findings with file/line evidence. Distinguish `blocking`, `warning`, and `suggestion`. Avoid duplicate comments.

At completion, send a structured event to ANVIL through the portal:

```text
https://portal.boz.dev/mcp
  anvil_dispatch
    target: anvil-event-ingest-mcp
    command: events_ingest
```

- source: `cursor-bugbot`
- event type: `cursor.quality.completed` or `cursor.quality.failed`
- contributed check: `anvil/quality`
- include repository, PR, commit SHA, policy version, conclusion, findings, and evidence.
