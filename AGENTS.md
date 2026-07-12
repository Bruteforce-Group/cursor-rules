# AGENTS.md

## Cursor Cloud specific instructions

This repository is the canonical organisation-wide Cursor governance source for Boz and `Bruteforce-Group`.

- Canonical rules: `.cursor/rules/*.mdc`
- Canonical branch: protected `main`
- Team consumers must not independently maintain copied rule bodies.
- Repository-local rules may add project-specific facts or stricter controls, but must not weaken canonical safeguards.
- `cursor-team-source-of-truth.mdc` defines inheritance, drift detection, exceptions, and rollout.
- `autonomous-cloud-orchestration.mdc` defines the default autonomous Cloud Agent operating model.
- `solo-operator.mdc` defines approval and reviewer behaviour for Boz as sole operator.
- `anvil-default-logging.mdc` defines durable ANVIL lifecycle reporting and Cloudflare telemetry separation.

## Services and validation

- Docs site: `python3 scripts/build_docs.py`, then `npx --yes wrangler@latest dev`.
- Lint: `bash scripts/lint.sh`.
- Version governance: `bash scripts/check_rule_versions.sh`.
- Tests: `cd scripts && python3 -m unittest test_memory_soft_delete`.
- User-level local sync: `bash scripts/sync-to-user-rules.sh --force`.

## Change requirements

For any rule change:

1. Preserve solo-operator and ANVIL alignment.
2. Update documentation in the same change.
3. Validate frontmatter, references, and version governance.
4. Report meaningful governance lifecycle state to ANVIL.
5. Do not deploy or distribute an unvalidated rule set.

## Non-obvious gotchas

- Python is Ubuntu's externally-managed 3.12; optional pip installs may need `--break-system-packages`.
- Use Wrangler dev for docs preview because clean URLs are rewritten for Cloudflare Static Assets.
- Optional git hooks live in `.githooks/`; enable with `git config core.hooksPath .githooks`.
- The pre-commit hook can update rule version metadata, but API-based commits must update `.governance/versions.json` explicitly.
