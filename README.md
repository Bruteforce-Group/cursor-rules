# Cursor Rules

Canonical source of truth for Cursor AI rules. This repo syncs to `~/.cursor/rules/` (user-level) so all workspaces inherit the rules automatically. Individual projects can add project-specific overrides in their own `.cursor/rules/` directory.

## Architecture

```
cursor-rules repo (.cursor/rules/*.mdc)    <-- canonical source
        │
        │  scripts/sync-to-user-rules.sh
        ▼
~/.cursor/rules/*.mdc                      <-- user-level (all workspaces)
        │
        │  Cursor loads automatically
        ▼
Any workspace you open                     <-- rules active in every chat
        +
<project>/.cursor/rules/*.mdc              <-- project-specific overrides
```

## Quick start

```bash
# Sync all rules to user-level
./scripts/sync-to-user-rules.sh --force

# Preview what would change
./scripts/sync-to-user-rules.sh --dry-run

# List all rules and their apply mode
./scripts/sync-to-user-rules.sh --list
```

## Layout

- `.cursor/rules/*.mdc`: Individual rule files written in Cursor's Markdown-with-frontmatter format.
  - `description`: short summary of what the rule set covers.
  - `globs`: file patterns the rules apply to (required unless `alwaysApply: true`).
  - `alwaysApply`: whether the rule applies even when globs don't match the active file.
  - `version`: semver version tracked by governance CI.

### Rule scoping

Rules are divided into two categories:

- **Always-applied (cross-cutting):** Universal engineering standards that apply regardless of what file is active.
- **Glob-scoped / on-demand (domain-specific):** Only activate when the active file matches their `globs` patterns, or when Cursor determines they're relevant.

### Included rule sets

#### ANVIL platform (always-applied)

- `anvil-stack.mdc`: Hub architecture, component registry, routing hierarchy, deploy commands.
- `anvil-engineering-rules.mdc`: COVE-ENG-AUTONOMY-001 rules 1–4 (SDK-first, best practice, latest versions, justify custom code).
- `anvil-dev-mode.mdc`: Dev standards — CI, secrets, versioning, structured logging, CF Workers patterns.
- `anvil-task-system.mdc`: ATOB lanes, safety gates, task envelope, output contract footer format.

#### ANVIL platform (glob-scoped)

- `anvil-component-scaffold.mdc`: Component naming, wrangler.toml template, deploy checklist. Fires on `components/**/*`, `hub/**/*`, `**/wrangler.toml`.
- `anvil-dispatch-protocol.mdc`: Hub↔component wire format, event vocabulary, auth architecture. Fires on `**/dispatch*`, `**/index.ts`, `**/index.js`, `components/**/*`.

#### Engineering standards (always-applied)

- `general.mdc`: Status reporting, dependency hygiene, logging, no secrets.
- `security.mdc`: Secure development practices (threat modeling, hardening).
- `observability.mdc`: Observability practices (metrics, logs, traces, alerts).
- `compliance.mdc`: Compliance practices (auditability, retention, approvals).
- `self-verification.mdc`: Verify work is complete before reporting done.
- `python-standards.mdc`: Python tooling (uv, ruff, mypy, pytest, hatchling).
- `project-creation.mdc`: Project scaffolding standards.
- `logging-and-data.mdc`: Logging, data storage, and transfer verification.

#### Domain-specific (glob-scoped)

- `backend.mdc`: Server/back-end practices (APIs, data, reliability).
- `frontend.mdc`: Client/front-end practices (UX, accessibility, performance).
- `infra.mdc`: Infrastructure/IaC practices (Terraform, pipelines, safety).
- `mobile.mdc`: Mobile platform practices (iOS/Android, performance, offline).
- `data.mdc`: Data/analytics practices (pipelines, schemas, privacy).
- `ml-ai.mdc`: ML/AI pipeline practices (data, training, serving).
- `secrets.mdc`: Secret management practices (vaults, rotation, usage).
- `qa-testing.mdc`: QA and testing practices (pyramid, determinism, coverage).
- `performance.mdc`: Performance and efficiency practices (profiling, budgets).
- `object-detection.mdc`: Vision/object-detection practices (coverage, privacy, latency).
- `ai-insights.mdc`: AI insights module standards (deterministic analytics, model routing).
- `docs-writing.mdc`: Technical writing and documentation standards.
- `ui-testing.mdc`: Visual regression testing for GUI/TUI applications.
- `mintlify-docs.mdc`: Mintlify component reference for docs.bozza.au.

#### On-demand (agent-requestable)

- `agent-integration.mdc`: Contains Studio AI agent library reference.

### Rule versions

| Module | Version | Scoping |
| --- | --- | --- |
| anvil-stack | 1.0.0 | always-applied |
| anvil-engineering-rules | 1.0.0 | always-applied |
| anvil-dev-mode | 1.0.0 | always-applied |
| anvil-task-system | 1.0.0 | always-applied |
| anvil-component-scaffold | 1.0.0 | glob-scoped |
| anvil-dispatch-protocol | 1.0.0 | glob-scoped |
| general | 1.2.1 | always-applied |
| security | 1.1.0 | always-applied |
| observability | 1.1.0 | always-applied |
| compliance | 1.1.0 | always-applied |
| self-verification | 1.1.0 | always-applied |
| python-standards | 1.0.0 | always-applied |
| project-creation | 1.1.0 | always-applied |
| logging-and-data | 1.0.0 | always-applied |
| backend | 1.1.0 | glob-scoped |
| frontend | 1.1.0 | glob-scoped |
| infra | 1.1.0 | glob-scoped |
| mobile | 1.1.0 | glob-scoped |
| data | 1.1.0 | glob-scoped |
| ml-ai | 1.1.0 | glob-scoped |
| secrets | 1.1.0 | glob-scoped |
| qa-testing | 1.1.0 | glob-scoped |
| performance | 1.1.0 | glob-scoped |
| object-detection | 1.1.0 | glob-scoped |
| ai-insights | 1.1.0 | glob-scoped |
| docs-writing | 1.1.0 | glob-scoped |
| ui-testing | 1.0.0 | glob-scoped |
| mintlify-docs | 1.1.0 | glob-scoped |
| agent-integration | 1.0.0 | on-demand |

### Versioning & governance

- Repo version: `VERSION` (currently 1.3.0) and module versions in each `.mdc`.
- Baseline: `.governance/versions.json` records expected versions; CI (`version-governance.yml`) fails if mismatched.
- Local hook (optional): run `git config core.hooksPath .githooks` to enable the provided `pre-commit` hook; it auto-runs `scripts/bump_rule_versions.sh` when rules change and restages versioned files.
- Manual bump: `scripts/bump_rule_versions.sh [new_version]` (defaults to patch bump from `VERSION`)  .
- Check consistency: `scripts/check_rule_versions.sh`.

### Security CI

- `security.yml`: gitleaks (secret scanning), OSV-Scanner (dependency vulns), Trivy FS scan (HIGH/CRITICAL; ignore-unfixed). Trivy report is uploaded as an artifact.
- Additional Trivy deps-only lockfile scan (HIGH/CRITICAL; ignore-unfixed); report uploaded.
- SBOM generation (Syft) and Trivy SBOM scan (HIGH/CRITICAL; ignore-unfixed); SBOM and report uploaded.
- Dependabot (`.github/dependabot.yml`) keeps GitHub Actions deps updated weekly and other ecosystems with major bumps ignored by default.

### Branch protection (recommended)

- Require passing checks on main/protected branches: `lint`, `version-governance`, `security`.
- Block force-pushes and require PRs with at least one approval.
- Optionally require status checks for object detection budgets if relevant to your workflows.

### Dependabot extensions

- Current: GitHub Actions weekly.
- When language ecosystems are added, extend `.github/dependabot.yml` with `npm`, `pip`, `gomod`, etc., scoped to relevant directories, with separate schedules and labels.

### Object detection budgets (reference)

| Tier          | Example hardware                       | Notes                                                   |
|---------------|----------------------------------------|---------------------------------------------------------|
| Edge/Standard | Jetson Nano/Orin Nano, Pi + NPU, low-GPU | Target ≤120 ms/frame, ≥25 FPS, mAP@0.5 ≥0.50, recall ≥0.80 |
| Enhanced      | Jetson Xavier NX/Orin NX, mid GPUs (T4/3060) | Target ≤80 ms/frame, ≥30 FPS, mAP@0.5 ≥0.60, recall ≥0.85 |
| Centralized   | Data-center GPUs (A10/A100/4090)        | Target ≤50 ms/frame or ≥40 FPS, mAP@0.5 ≥0.65, mAP@0.5:0.95 ≥0.40 |

### Changelog

#### v1.3.0

- **ANVIL rule set:** Added 6 ANVIL-platform rules — `anvil-stack`, `anvil-engineering-rules`, `anvil-dev-mode`, `anvil-task-system` (always-applied) and `anvil-component-scaffold`, `anvil-dispatch-protocol` (glob-scoped). Synthesised from ANVIL spec, COVE-ENG-AUTONOMY-001, and ATOB-001/002 ClickUp docs.
- **Removed `aikido_rules.mdc`:** Aikido MCP integration removed from all rules and governance tracking.
- **Updated overlapping rules:** `project-creation`, `self-verification`, and `mintlify-docs` replaced with ANVIL-aware versions (bumped to 1.1.0).

#### v1.2.0

- **User-level sync:** Added `scripts/sync-to-user-rules.sh` to deploy all rules to `~/.cursor/rules/` as user-level rules. This replaces the copy-into-each-project workflow.
- **Added 7 personal rules:** `project-creation`, `logging-and-data`, `self-verification`, `python-standards`, `ui-testing`, `mintlify-docs`, `agent-integration` — previously maintained separately in `~/.cursor/rules/`.
- **Removed `.cursorrules` monolith:** The backward-compatibility pointer file is no longer needed.
- **Governance updated:** `.governance/versions.json` now tracks all 24 rule modules.

#### v1.1.0

- **Rule scoping overhaul:** Set `alwaysApply: false` on domain-specific rules so they only activate when globs match. Cross-cutting rules (general, security, observability, compliance) remain always-applied.
- **Added `ai-insights.mdc`:** Comprehensive AI insights module standards.
- **Added `docs-writing.mdc`:** Technical writing and documentation standards.
- **Added globs** to `ml-ai.mdc`, `observability.mdc`, and `compliance.mdc` for proper scoping.
- **Version governance updated:** `.governance/versions.json` now tracks all 16 rule modules.

#### v1.0.0

- Initial release with 14 rule modules covering backend, frontend, infra, mobile, data, security, ML/AI, secrets, QA/testing, observability, performance, compliance, object-detection, and general.

## Usage

1. Clone this repo and run `./scripts/sync-to-user-rules.sh --force` to deploy all rules to `~/.cursor/rules/`.
2. Start a new Cursor chat — all rules are active immediately.
3. When you edit a rule in this repo, re-run the sync script to update `~/.cursor/rules/`.
4. For project-specific overrides, add `.mdc` files to `<project>/.cursor/rules/` — they sit alongside (not replace) user-level rules.
5. Commit rule changes to this repo so updates are versioned and auditable.

## Documentation (docs.bozza.au)

- Primary docs are hosted from `bruteforce-group/docs` (branch `main`, path `docs/`) and published to `https://docs.bozza.au` via the Mintlify GitHub App. This repo is for rules; author docs in the central docs repo.
- Keep `docs/docs.json` in that repo in sync with actual files: every page listed must have a matching MDX/MD file under `docs/`. Add or remove nav entries together with the files to avoid broken-links failures.
- The full Mintlify component reference and style guide is available at `docs/mintlify-style-guide.md`.
- If you run link checks here, `.github/workflows/mintlify-deploy.yml` only runs `mintlify broken-links` from `docs/` and skips when `docs/docs.json` is absent. No deploy step runs in this repo.

## Contributing

- Keep rules concise and action-oriented.
- Prefer scoped rule files with targeted `globs` and `alwaysApply: false` for domain-specific guidance.
- Only use `alwaysApply: true` for genuinely cross-cutting concerns (security, observability, compliance, ANVIL platform).
- Document rationale when adding opinionated rules to reduce friction.
