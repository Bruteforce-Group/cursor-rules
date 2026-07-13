---
title: "Cursor GitHub integration"
description: "Configure Cursor Cloud GitHub access — app installation, GH_PAT, and permission verification."
---

## Problem

Cloud agents often fail GitHub API calls with:

```
GraphQL: Resource not accessible by integration (updatePullRequest)
```

Even when the **Cursor GitHub App** shows full read/write permissions at install time, the **sandbox installation token is down-scoped** — it typically has `contents:write` (git push) but **not** `pull_requests:write`, `issues:write`, or label/comment/merge APIs.

This is a [known Cursor limitation](https://forum.cursor.com/t/cloud-agent-unable-to-edit-pr-description-or-add-comment/158985), not a misconfigured org install.

## What works today

| Operation | Built-in Cursor token | With `GH_PAT` Runtime Secret |
| --- | --- | --- |
| Clone / read repo | ✓ | ✓ |
| Git push to branch | ✓ | ✓ |
| Create PR (`gh pr create`) | ✗ often fails | ✓ |
| Update PR / labels / comments | ✗ | ✓ |
| Approve / merge PR | ✗ | ✓ |
| Read/write GitHub Issues | ✗ | ✓ |
| `workflow_dispatch` | ✗ | ✓ (if PAT has `workflow` scope) |

## Step 1 — Verify Cursor GitHub App (org admin)

1. Open **GitHub → Bruteforce-Group → Settings → GitHub Apps → Cursor**  
   Or: https://github.com/organizations/Bruteforce-Group/settings/installations
2. Click **Configure** on the Cursor installation.
3. Confirm **Repository access** includes `cursor-rules` (or **All repositories**).
4. Confirm permissions show at least:
   - **Contents:** Read and write
   - **Pull requests:** Read and write
   - **Issues:** Read and write
   - **Workflows:** Read and write (optional; for manual dispatch)
   - **Metadata:** Read (always)
5. Click **Save** if you changed anything, then **re-authorize** if prompted.

> Reinstalling the app alone does **not** fix `updatePullRequest` — the sandbox token remains narrower than the installation UI suggests.

## Step 2 — Add `GH_PAT` to Cursor Cloud Environment (required for PR API)

The supported workaround is a **Personal Access Token** stored as a **Runtime Secret** named `GH_PAT`. Use `GH_PAT` rather than `GH_TOKEN` — Cursor may inject its own installation token into `GH_TOKEN` (`ghs_…`), which overrides a PAT you set under that name.

### Create a fine-grained PAT (recommended)

1. GitHub → **Settings → Developer settings → Fine-grained personal access tokens → Generate new token**
2. **Resource owner:** `Bruteforce-Group`
3. **Repository access:** Only `cursor-rules`, or repositories your agents use
4. **Permissions:**
   - Contents: **Read and write**
   - Pull requests: **Read and write**
   - Issues: **Read and write** (if agents read/create issues)
   - Workflows: **Read and write** (only if agents must trigger workflows)
   - Metadata: **Read** (automatic)
5. Copy the token (`github_pat_...`).

### Or classic PAT

Create at https://github.com/settings/tokens with scope **`repo`** (full control of private repositories).

### Add to Cursor Cloud Environment

**Option A — Playwright configurator (headed Mac, authenticated profile):**

```bash
cd automation/cursor-team-playwright
npm install && npm run install-browser
export CURSOR_CLOUD_ENVIRONMENT="cursor-rules"
npm run setup -- --apply --headed --cloud-only \
  --environment-name "$CURSOR_CLOUD_ENVIRONMENT" \
  --runtime-secret-file ~/.config/cursor/gh_pat.env
```

See [Cursor Team Playwright setup](cursor-team-playwright.md) for discovery mode and full package apply.

**Option B — Cursor dashboard (manual):**

1. Cursor → **Cloud** → **Environments** → select (or create) the environment used for `cursor-rules` agents
2. **Secrets** → add Runtime Secret:
   ```
   GH_PAT=github_pat_xxxxxxxx
   ```
3. Save and **rebuild / restart** the environment, then **start a new cloud agent run** so the secret is injected (continuing an existing run does not reload secrets).

The verifier script exports `GH_PAT` to `GH_TOKEN` for `gh` CLI compatibility.

## Step 3 — Verify in a cloud agent run

```bash
./scripts/verify-github-agent-permissions.sh
```

Expected when configured correctly:

```
✓ GH_PAT is set (PAT override active)
✓ gh auth status — authenticated
✓ pull_requests:write — can list PRs
✓ issues:read — can list issues (optional)
```

## Step 4 — Repo auto-ship fallback (no PAT)

If you cannot add `GH_PAT`, this repo ships eligible **`cursor/**`** PRs via GitHub Actions — agents only need **git push**. See [CI & deploy](ci-workflow.md) and [Single-operator mode](solo-operator.md).

Manual merge fallback: comment **`/ship`** on a PR (repo OWNER/MEMBER/COLLABORATOR).

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `updatePullRequest` / `addLabelsToLabelable` | Add `GH_PAT` Runtime Secret with pull_requests write |
| `createPullRequest` fails | Same — PAT with pull_requests write |
| `repository.issues` 403 | PAT with issues read/write |
| Push works, nothing else | Expected with built-in token only — add PAT |
| PAT works locally but not in cloud | Add secret to **Cloud Environment**, not local shell |
| Branch protection blocks merge | Use `GH_PAT` in Actions (already configured) or merge via `/ship` |

## Security notes

- Store PAT only in **Cursor Cloud Environment secrets** or GitHub Actions secrets — never commit to the repo.
- Prefer **fine-grained PAT** scoped to specific repos and minimum permissions.
- Rotate PAT on the same cadence as other service tokens.
