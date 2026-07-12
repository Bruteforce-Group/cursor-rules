#!/usr/bin/env bash
# Verify GitHub permissions available to Cursor Cloud agents in this sandbox.
# Run after configuring GH_TOKEN in the Cloud Environment.
set -euo pipefail

REPO="${GITHUB_REPOSITORY:-Bruteforce-Group/cursor-rules}"
FAIL=0

pass() { echo "✓ $*"; }
fail() { echo "✗ $*"; FAIL=1; }
info() { echo "  $*"; }

echo "GitHub agent permission check"
echo "Repository: $REPO"
echo ""

# --- GH_TOKEN override ---
if [ -n "${GH_TOKEN:-}" ]; then
  pass "GH_TOKEN is set (PAT override active)"
else
  info "GH_TOKEN not set — using Cursor installation token only (limited PR/issue API)"
fi

# --- gh auth ---
if gh auth status >/dev/null 2>&1; then
  pass "gh CLI authenticated"
  gh auth status 2>&1 | sed 's/^/  /'
else
  fail "gh CLI not authenticated"
fi

echo ""

# --- API probes (best-effort) ---
probe() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    pass "$name"
  else
    fail "$name"
    info "Run manually to see error: $*"
  fi
}

probe "pull_requests:read (gh pr list)" \
  gh pr list --repo "$REPO" --limit 1

PR_NUM="$(gh pr list --repo "$REPO" --limit 1 --json number --jq '.[0].number' 2>/dev/null || true)"
if [ -n "$PR_NUM" ] && [ "$PR_NUM" != "null" ]; then
  probe "pull_requests:read detail (gh pr view)" \
    gh pr view "$PR_NUM" --repo "$REPO" --json title
else
  info "No open PRs — skipping pr view write probe"
fi

if gh issue list --repo "$REPO" --limit 1 >/dev/null 2>&1; then
  pass "issues:read (gh issue list)"
else
  info "issues:read unavailable (optional — add GH_TOKEN if agents use issues)"
fi

# Label write is a common failure mode for cloud agents
if gh api "repos/$REPO/labels" --jq 'length' >/dev/null 2>&1; then
  pass "issues/labels API read"
else
  fail "issues/labels API — label/comment operations may fail"
fi

# Installation token often lacks user endpoint
if gh api user --jq '.login' >/dev/null 2>&1; then
  pass "user API (full PAT)"
else
  info "user API unavailable (normal for installation-only token)"
fi

echo ""
if [ -z "${GH_TOKEN:-}" ]; then
  info "Recommendation: set GH_TOKEN in Cursor Cloud Environment for pull_requests:write"
  echo "  See docs/cursor-github-integration.md"
  exit 1
fi

if [ "$FAIL" -eq 0 ]; then
  echo "All required checks passed."
  exit 0
fi

echo ""
echo "Some checks failed. For Cursor Cloud agents, add GH_TOKEN to your Cloud Environment:"
echo "  docs/cursor-github-integration.md"
exit 1
