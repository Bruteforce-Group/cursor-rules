# Cursor Rules

Private repository for storing reusable Cursor rules. Copy or cherry-pick the `.cursor/rules` directory into any project to enforce the shared guidance below, then add project-specific rule files as needed.

> **Distribution note:** Modern Cursor versions auto-detect `.cursor/rules/*.mdc` files without any additional configuration. The `.cursorrules` pointer file at the repo root is kept for backward compatibility but is not required for Cursor >= 0.43.

## Layout

- `.cursor/rules/*.mdc`: Individual rule files written in Cursor's Markdown-with-frontmatter format.
  - `description`: short summary of what the rule set covers.
  - `globs`: file patterns the rules apply to (required unless `alwaysApply: true`).
  - `alwaysApply`: whether the rule applies even when globs don't match the active file.
  - `version`: semver version tracked by governance CI.

### Rule scoping

Rules are divided into two categories:

- **Always-applied (cross-cutting):** `general`, `security`, `observability`, `compliance` — these apply regardless of what file is active, because they represent universal engineering standards.
- **Glob-scoped (domain-specific):** All other rules — these only activate when the active file matches their `globs` patterns, reducing context noise and improving signal quality.

### Included rule sets

- `general.mdc`: Always-on guidance for all files.
- `backend.mdc`: Server/back-end practices (APIs, data, reliability).
- `frontend.mdc`: Client/front-end practices (UX, accessibility, performance).
- `infra.mdc`: Infrastructure/IaC practices (Terraform, pipelines, safety).
- `mobile.mdc`: Mobile platform practices (iOS/Android, performance, offline).
- `data.mdc`: Data/analytics practices (pipelines, schemas, privacy).
- `security.mdc`: Secure development practices (threat modeling, hardening). Always-applied.
- `ml-ai.mdc`: ML/AI pipeline practices (data, training, serving).
- `secrets.mdc`: Secret management practices (vaults, rotation, usage).
- `qa-testing.mdc`: QA and testing practices (pyramid, determinism, coverage).
- `observability.mdc`: Observability practices (metrics, logs, traces, alerts). Always-applied.
- `performance.mdc`: Performance and efficiency practices (profiling, budgets).
- `compliance.mdc`: Compliance practices (auditability, retention, approvals). Always-applied.
- `object-detection.mdc`: Vision/object-detection practices (coverage, privacy, latency).
- `ai-insights.mdc`: AI insights module standards (deterministic analytics, model routing, LLM integration).
- `docs-writing.mdc`: Technical writing and documentation standards (Mintlify, general docs).

### Rule versions

| Module | Version | Scoping |
| --- | --- | --- |
| general | 1.1.0 | always-applied |
| backend | 1.1.0 | glob-scoped |
| frontend | 1.1.0 | glob-scoped |
| infra | 1.1.0 | glob-scoped |
| mobile | 1.1.0 | glob-scoped |
| data | 1.1.0 | glob-scoped |
| security | 1.1.0 | always-applied |
| ml-ai | 1.1.0 | glob-scoped |
| secrets | 1.1.0 | glob-scoped |
| qa-testing | 1.1.0 | glob-scoped |
| observability | 1.1.0 | always-applied |
| performance | 1.1.0 | glob-scoped |
| compliance | 1.1.0 | always-applied |
| object-detection | 1.1.0 | glob-scoped |
| ai-insights | 1.1.0 | glob-scoped |
| docs-writing | 1.1.0 | glob-scoped |

### Versioning & governance

- Repo version: `VERSION` (currently 1.1.0) and module versions in each `.mdc`.
- Baseline: `.governance/versions.json` records expected versions; CI (`version-governance.yml`) fails if mismatched.
- Local hook (optional): run `git config core.hooksPath .githooks` to enable the provided `pre-commit` hook; it auto-runs `scripts/bump_rule_versions.sh` when rules change and restages versioned files.
- Manual bump: `scripts/bump_rule_versions.sh [new_version]` (defaults to patch bump from `VERSION`).
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

### Recent updates

#### v1.1.0

- **Rule scoping overhaul:** Set `alwaysApply: false` on domain-specific rules so they only activate when globs match. Cross-cutting rules (general, security, observability, compliance) remain always-applied.
- **Added `ai-insights.mdc`:** Comprehensive AI insights module standards covering deterministic analytics, provider-agnostic model routing with Apple Silicon fallback, feature flags, scheduling, and model-specific observability metrics.
- **Added `docs-writing.mdc`:** Technical writing and documentation standards extracted from the Mintlify style guide, scoped to docs and markdown files.
- **Added globs** to `ml-ai.mdc`, `observability.mdc`, and `compliance.mdc` for proper scoping.
- **Fixed lint script:** Universal rules (`alwaysApply: true`) can now omit `globs` without failing validation.
- **Relocated Mintlify style guide:** Full component reference moved from `.cursor/rules.md` to `docs/mintlify-style-guide.md`.
- **Version governance updated:** `.governance/versions.json` now tracks all 16 rule modules.

#### v1.0.0

- Added authZ-aware rate limiting/abuse protection to backend rules.
- Added CI secret scanning with rotation cadences in compliance/general rules.
- Added consent/DSAR/erasure handling and privacy-aware telemetry in data/frontend/mobile rules.
- Added CSP/HSTS/SRI and RUM budgets for key journeys in frontend/performance rules.
- Added supply-chain controls, DR readiness (backup/restore, failover), and RTO/RPO guidance in infra rules.
- Added model cards, safety/abuse evaluations, and PII scrubbing for ML/AI rules.
- Added encryption/retention guardrails for vision/object-detection media.
- Added alert/runbook hygiene and error-budget policies in observability rules.
- Added contract/schema drift checks for external integrations in QA/testing rules.

## Usage

1. Copy `.cursor/rules/` into a target repo (or add this repo as a submodule). Modern Cursor versions auto-detect `.mdc` files in `.cursor/rules/` — no additional configuration needed.
2. Optionally copy `.cursorrules` for backward compatibility with older Cursor versions.
3. Add or edit `.mdc` files to cover language- or area-specific guidance (e.g., `backend.mdc`, `frontend.mdc`, `infra.mdc`).
4. Set `alwaysApply: false` on domain-specific rules and scope them with `globs` for best signal-to-noise ratio.
5. Commit rule changes so updates are versioned alongside code.

## Documentation (docs.bozza.au)

- Primary docs are hosted from `bruteforce-group/docs` (branch `main`, path `docs/`) and published to `https://docs.bozza.au` via the Mintlify GitHub App. This repo is for rules; author docs in the central docs repo.
- Keep `docs/docs.json` in that repo in sync with actual files: every page listed must have a matching MDX/MD file under `docs/`. Add or remove nav entries together with the files to avoid broken-links failures.
- The full Mintlify component reference and style guide is available at `docs/mintlify-style-guide.md`.
- If you run link checks here, `.github/workflows/mintlify-deploy.yml` only runs `mintlify broken-links` from `docs/` and skips when `docs/docs.json` is absent. No deploy step runs in this repo.

## Contributing

- Keep rules concise and action-oriented.
- Prefer scoped rule files with targeted `globs` and `alwaysApply: false` for domain-specific guidance.
- Only use `alwaysApply: true` for genuinely cross-cutting concerns (security, observability, compliance).
- Document rationale when adding opinionated rules to reduce friction.
