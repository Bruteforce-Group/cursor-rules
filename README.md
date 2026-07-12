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

## Cursor Team and internal CI

- `cursor-team/manifest.json` is the machine-readable Team package inventory.
- `cursor-team/*.md` contains Team Content, Bugbot, Security Agent, and Approval Agent configurations.
- `.cursor/commands/*.md` contains the operator commands distributed with Team Content.
- `scripts/validate_cursor_team.py` enforces the portal-only ANVIL boundary, exact event route, required templates, commands, and consolidated checks.
- `docs/cursor-team-rollout.md` is the apply-and-verify runbook.

Cursor agents connect externally only through `https://portal.boz.dev/mcp` and contribute evidence to `anvil/quality`, `anvil/security`, `anvil/approval`, `anvil/governance`, or `anvil/deployment`.

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
- `anvil-default-logging.mdc`: Mandatory structured, bounded, redacted ANVIL lifecycle logging and correlation.
- `anvil-engineering-rules.mdc`: COVE-ENG-AUTONOMY-001 rules 1–4 (SDK-first, best practice, latest versions, justify custom code).
- `anvil-dev-mode.mdc`: Dev standards — CI, secrets, versioning, structured logging, CF Workers patterns.
- `anvil-task-system.mdc`: ATOB lanes, safety gates, task envelope, output contract footer format.
- `auto-memory-soft-delete.mdc`: Soft-delete lifecycle for file-backed auto-memory entries.

#### ANVIL platform (glob-scoped)

- `anvil-component-scaffold.mdc`: Component naming, wrangler.toml template, deploy checklist. Fires on `components/**/*`, `hub/**/*`, `**/wrangler.toml`.
- `anvil-dispatch-protocol.mdc`: Hub↔component wire format, event vocabulary, auth architecture. Fires on `**/dispatch*`, `**/index.ts`, `**/index.js`, `components/**/*`.
- `anvil-doc-sync.mdc`: Same-session documentation sync for any change to system state. Fires on `components/**`, `hub/**`, `docs/**`, `**/CLAUDE.md`, `**/AGENTS.md`.
- `anvil-output-contract.mdc`: ATOB v2 structured output contract for COVE/Cowork task responses. Fires on ATOB/task-envelope files.

#### Engineering standards (always-applied)

- `autonomous-cloud-orchestration.mdc`: Multi-workstream cloud-agent planning, safe autonomy, blocker recovery, and integration discipline.
- `autonomous-development-lifecycle.mdc`: Own changes end-to-end — implementation, tests, security, CI, and merge readiness, ending with a required completion report.
- `cursor-internal-ci.mdc`: Cursor-plus-ANVIL CI operating model, event envelope, consolidated checks, and GitHub Actions retirement gates.
- `cursor-team-source-of-truth.mdc`: Organisation authority, repository inheritance, drift detection, rollout, and exception policy.
- `docker-cicd.mdc`: Container build, test, publication, provenance, deployment, and rollback standards.
- `general.mdc`: Status reporting, dependency hygiene, logging, no secrets.
- `security.mdc`: Secure development practices (threat modeling, hardening).
- `observability.mdc`: Observability practices (metrics, logs, traces, alerts).
- `compliance.mdc`: Compliance practices (auditability, retention, approvals).
- `self-verification.mdc`: Verify work is complete before reporting done.
- `solo-operator.mdc`: Single-operator mode (Boz) — relaxes multi-agent/reviewer team rules while keeping security and quality gates.
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
- `docs-writing.mdc`: Plain-Markdown technical writing standards for the self-managed docs site.
- `ui-testing.mdc`: Visual regression testing for GUI/TUI applications.

#### On-demand (agent-requestable)

- `agent-integration.mdc`: Contains Studio AI agent library reference.

### Rule versions

| Module | Version | Scoping |
| --- | --- | --- |
| anvil-stack | 1.7.1 | always-applied |
| anvil-default-logging | 1.7.1 | always-applied |
| anvil-engineering-rules | 1.7.1 | always-applied |
| anvil-dev-mode | 1.7.1 | always-applied |
| anvil-task-system | 1.7.1 | always-applied |
| anvil-component-scaffold | 1.7.1 | glob-scoped |
| anvil-dispatch-protocol | 1.7.1 | glob-scoped |
| anvil-doc-sync | 1.7.1 | glob-scoped |
| anvil-output-contract | 1.7.1 | glob-scoped |
| auto-memory-soft-delete | 1.7.1 | always-applied |
| autonomous-cloud-orchestration | 1.7.1 | always-applied |
| solo-operator | 1.7.1 | always-applied |
| autonomous-development-lifecycle | 1.7.1 | always-applied |
| cursor-internal-ci | 1.7.1 | always-applied |
| cursor-team-source-of-truth | 1.7.1 | always-applied |
| docker-cicd | 1.7.1 | always-applied |
| general | 1.7.1 | always-applied |
| security | 1.7.1 | always-applied |
| observability | 1.7.1 | always-applied |
| compliance | 1.7.1 | always-applied |
| self-verification | 1.7.1 | always-applied |
| project-creation | 1.7.1 | always-applied |
| logging-and-data | 1.7.1 | always-applied |
| backend | 1.7.1 | glob-scoped |
| frontend | 1.7.1 | glob-scoped |
| infra | 1.7.1 | glob-scoped |
| mobile | 1.7.1 | glob-scoped |
| data | 1.7.1 | glob-scoped |
| ml-ai | 1.7.1 | glob-scoped |
| secrets | 1.7.1 | glob-scoped |
| qa-testing | 1.7.1 | glob-scoped |
| performance | 1.7.1 | glob-scoped |
| object-detection | 1.7.1 | glob-scoped |
| ai-insights | 1.7.1 | glob-scoped |
| docs-writing | 1.7.1 | glob-scoped |
| ui-testing | 1.7.1 | glob-scoped |
| agent-integration | 1.7.1 | on-demand |

### Versioning & governance

- Repo version: `VERSION` (currently 1.7.1) and module versions in each `.mdc`.
- Baseline: `.governance/versions.json` records expected versions; CI (`version-governance.yml`) fails if mismatched.
- Local hook (optional): run `git config core.hooksPath .githooks` to enable the provided `pre-commit` hook; it auto-runs `scripts/bump_rule_versions.sh` when rules change and restages versioned files.
- Manual bump: `scripts/bump_rule_versions.sh [new_version]` (defaults to patch bump from `VERSION`)  .
- Check consistency: `scripts/check_rule_versions.sh`.

### Security CI

- `security.yml`: gitleaks (secret scanning), OSV-Scanner (dependency vulns), Trivy FS scan (HIGH/CRITICAL; ignore-unfixed). Trivy report is uploaded as an artifact.
- Additional Trivy deps-only lockfile scan (HIGH/CRITICAL; ignore-unfixed); report uploaded.
- SBOM generation (Syft) and Trivy SBOM scan (HIGH/CRITICAL; ignore-unfixed); SBOM and report uploaded.
- Dependabot (`.github/dependabot.yml`) keeps GitHub Actions deps updated weekly and other ecosystems with major bumps ignored by default.

### ClickUp CI tracking

- `clickup-ci-tracker.yml` tracks critical CI workflows on `main` (`Drift Check`, `Sync ANVIL Rules`, `Security Scans`, `Docs`, `Version Governance`) and auto-manages ClickUp tasks:
  - failing runs (`failure`, `timed_out`, `cancelled`, `action_required`, `startup_failure`) -> upsert/open task
  - successful runs -> close task
- `drift-check.yml`, `sync-from-anvil.yml`, and `clickup-drift-close-on-merge.yml` still manage the dedicated drift task lifecycle.
- List routing strategy:
  - primary: dynamic list resolution by name (`CLICKUP_*_SPACE_NAME` + `CLICKUP_*_LIST_NAME`)
  - secondary: explicit list ID (`CLICKUP_TRACKING_LIST_ID` / `CLICKUP_DRIFT_LIST_ID`)
  - final fallback (chosen default): ClickUp list ID `901614505478` (ANVIL Hub active dev list)
- Required for CI tracking writes:
  - repo secret: `CLICKUP_API_TOKEN`
  - optional repo vars for dynamic routing: `CLICKUP_TRACKING_SPACE_NAME`, `CLICKUP_TRACKING_LIST_NAME`, `CLICKUP_DRIFT_SPACE_NAME`, `CLICKUP_DRIFT_LIST_NAME`
  - optional explicit IDs: `CLICKUP_TRACKING_LIST_ID`, `CLICKUP_DRIFT_LIST_ID`
  - optional debug toggle: `CLICKUP_TASK_RESOLVE_DEBUG` (`1`/`true`/`on`) to log resolution path (explicit/dynamic/fallback) in workflow logs

### Low-risk auto-ship

- `low-risk-auto-ship.yml` provides a low-friction merge lane for trusted small changes.
- Trigger model:
  - add PR label `automerge:low-risk`
  - workflow runs on `pull_request_target` updates
  - only PRs to `main` are considered
- Safety gates before auto-ship:
  - PR must only touch approved low-risk paths (docs, selected CI/workflow files, rule/version metadata files)
  - unresolved review threads are auto-resolved for labeled low-risk PRs
  - bot submits an approval review
  - auto-merge is enabled with squash strategy (`--auto --squash`)
- If a PR includes out-of-scope files, the workflow leaves a comment and does not auto-ship.

#### Debug runbook

- Enable diagnostics by setting repo variable `CLICKUP_TASK_RESOLVE_DEBUG=true`.
- Trigger a workflow (`Drift Check`, `Sync ANVIL Rules`, or any tracked workflow on `main`).
- Inspect the step that runs `node scripts/clickup-drift-task.js` and look for `[clickup-resolve]` lines.
- Typical outputs:
  - explicit ID path:
    - `[clickup-resolve] resolution path: explicit_id`
  - dynamic name path:
    - `[clickup-resolve] resolution input: space="AI Oversight & Governance", list="ANVIL Hub Active Dev", team="auto"`
    - `[clickup-resolve] found 3 space(s) in team 90161246640`
    - `[clickup-resolve] matched preferred space "AI Oversight & Governance" (90163531881)`
    - `[clickup-resolve] collected 42 list candidate(s) for list match "ANVIL Hub Active Dev"`
    - `[clickup-resolve] resolution path: dynamic_name (folder="none")`
  - fallback path:
    - `[clickup-resolve] resolution path: dynamic_name_miss` (or `dynamic_name_error`)
    - `[clickup-resolve] resolution path: fallback_id`

### Branch protection (recommended)

- During migration, require existing repository checks plus the available ANVIL checks. After parity, require `anvil/quality`, `anvil/security`, `anvil/approval`, `anvil/governance`, and applicable `anvil/deployment`.
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

#### v1.7.1

- **Cursor rule config correctness:** Removed redundant `globs` from the always-applied `security`, `observability`, and `compliance` rules (globs are ignored when `alwaysApply: true`), and switched `agent-integration` to `alwaysApply: false` so it is a proper Agent Requested (on-demand) rule.
- **Linter:** `scripts/lint.sh` now recognizes all three Cursor activation modes (Always, Auto Attached, Agent Requested) instead of requiring globs on every non-always rule.
- **README sync:** Reconciled the rule lists and version table with the actual `.cursor/rules/` files — dropped the stale `python-standards` reference and documented `anvil-doc-sync`, `anvil-output-contract`, `auto-memory-soft-delete`, and `solo-operator`.

#### v1.7.0

- **Replaced Mintlify with a self-managed docs pipeline:** removed the Mintlify CI workflow, `docs.json`, `.mdx` pages, the Mintlify admin `wrangler.toml`, and the `mintlify-docs.mdc` rule. Docs are now plain Markdown built by `scripts/build_docs.py` and validated by `scripts/check_docs_links.py`, deployed to Cloudflare Workers Static Assets via `.github/workflows/docs.yml` and `wrangler.jsonc`.
- **Rewrote `docs-writing.mdc`** for portable plain-Markdown standards (frontmatter, relative links, `nav.json`, asset/alt-text rules) and removed the Mintlify component rule.

#### v1.6.0

- **Added `autonomous-development-lifecycle.mdc`:** Always-applied operating-mode rule that makes the agent own the full change lifecycle (repository discovery, environment verification, implementation/testing/security standards, commit & PR discipline, CI monitoring, deployment readiness, automerge governance, post-merge validation, follow-ups) and end with a required completion report.

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

## Documentation (self-managed)

This repo's docs are plain Markdown under `docs/`, built into a static site and
deployed to Cloudflare Workers — no third-party docs platform.

- **Author:** add `docs/<slug>.md` with `title` + `description` frontmatter and register it in `docs/nav.json`.
- **Validate + build locally:** `pip install -r requirements-docs.txt`, then `python3 scripts/check_docs_links.py` and `python3 scripts/build_docs.py` (output in `site/`).
- **CI:** `.github/workflows/docs.yml` runs the link check + build on PRs and additionally deploys to Cloudflare on `main`.
- **Deploy config:** `wrangler.jsonc` (Workers Static Assets). Deploys need a `CLOUDFLARE_API_TOKEN` repo secret (Workers Scripts + `boz.dev` zone Routes/DNS/SSL). Served at **https://docs.boz.dev** (custom domain) and the `*.workers.dev` URL.
- **Style:** see `docs/style-guide.md`.

## Contributing

- Keep rules concise and action-oriented.
- Prefer scoped rule files with targeted `globs` and `alwaysApply: false` for domain-specific guidance.
- Only use `alwaysApply: true` for genuinely cross-cutting concerns (security, observability, compliance, ANVIL platform).
- Document rationale when adding opinionated rules to reduce friction.
