# Cursor Rules

Private repository for storing reusable Cursor rules. Copy or cherry-pick the `.cursor/rules` directory into any project to enforce the shared guidance below, then add project-specific rule files as needed.

## Layout

- `.cursor/rules/*.mdc`: Individual rule files written in Cursor's Markdown-with-frontmatter format.
  - `description`: short summary of what the rule set covers.
  - `globs`: file patterns the rules apply to.
  - `alwaysApply`: whether the rule applies even when globs don’t match the active file.

## Usage

1. Copy `.cursor/rules` into a target repo (or add this repo as a submodule).
2. Add or edit `.mdc` files to cover language- or area-specific guidance (e.g., `backend.mdc`, `frontend.mdc`, `infra.mdc`).
3. Commit rule changes so updates are versioned alongside code.

## Contributing

- Keep rules concise and action-oriented.
- Prefer scoped rule files with targeted `globs`.
- Document rationale when adding opinionated rules to reduce friction.

