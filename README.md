# Cursor Rules

Private repository for storing reusable Cursor rules. Copy or cherry-pick the `.cursor/rules` directory into any project to enforce the shared guidance below, then add project-specific rule files as needed.

## Layout

- `.cursor/rules/*.mdc`: Individual rule files written in Cursor's Markdown-with-frontmatter format.
  - `description`: short summary of what the rule set covers.
  - `globs`: file patterns the rules apply to.
  - `alwaysApply`: whether the rule applies even when globs don’t match the active file.

### Included rule sets

- `general.mdc`: Always-on guidance for all files.
- `backend.mdc`: Server/back-end practices (APIs, data, reliability).
- `frontend.mdc`: Client/front-end practices (UX, accessibility, performance).
- `infra.mdc`: Infrastructure/IaC practices (Terraform, pipelines, safety).
- `mobile.mdc`: Mobile platform practices (iOS/Android, performance, offline).
- `data.mdc`: Data/analytics practices (pipelines, schemas, privacy).
- `security.mdc`: Secure development practices (threat modeling, hardening).
- `ml-ai.mdc`: ML/AI pipeline practices (data, training, serving).
- `secrets.mdc`: Secret management practices (vaults, rotation, usage).
- `qa-testing.mdc`: QA and testing practices (pyramid, determinism, coverage).
- `observability.mdc`: Observability practices (metrics, logs, traces, alerts).
- `performance.mdc`: Performance and efficiency practices (profiling, budgets).
- `compliance.mdc`: Compliance practices (auditability, retention, approvals).
- `object-detection.mdc`: Vision/object-detection practices (coverage, privacy, latency).

### Rule versions

| Module | Version |
| --- | --- |
| general | 1.0.0 |
| backend | 1.0.0 |
| frontend | 1.0.0 |
| infra | 1.0.0 |
| mobile | 1.0.0 |
| data | 1.0.0 |
| security | 1.0.0 |
| ml-ai | 1.0.0 |
| secrets | 1.0.0 |
| qa-testing | 1.0.0 |
| observability | 1.0.0 |
| performance | 1.0.0 |
| compliance | 1.0.0 |
| object-detection | 1.0.0 |

### Versioning & governance

- Repo version: `VERSION` (currently 1.0.0) and module versions in each `.mdc`.
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

## Usage

1. Copy `.cursor/rules` into a target repo (or add this repo as a submodule).
2. Add or edit `.mdc` files to cover language- or area-specific guidance (e.g., `backend.mdc`, `frontend.mdc`, `infra.mdc`).
3. Commit rule changes so updates are versioned alongside code.

## Contributing

- Keep rules concise and action-oriented.
- Prefer scoped rule files with targeted `globs`.
- Document rationale when adding opinionated rules to reduce friction.

