#!/usr/bin/env bash
# Idempotent dependency install for Cursor Cloud agents.
# Runs from the repository root on each agent startup.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

pip_install() {
  if python3 -m pip install "$@" --break-system-packages 2>/dev/null; then
    return 0
  fi
  python3 -m pip install "$@"
}

echo "Installing Python dependencies..."
python3 -m pip install --upgrade pip --break-system-packages 2>/dev/null \
  || python3 -m pip install --upgrade pip
pip_install --requirement requirements-docs.txt pyyaml

if [ -f automation/cursor-team-playwright/package.json ]; then
  echo "Installing cursor-team-playwright Node dependencies..."
  npm install --prefix automation/cursor-team-playwright --no-audit --no-fund
fi

if ! command -v actionlint >/dev/null 2>&1; then
  echo "Installing actionlint..."
  tmpdir="$(mktemp -d)"
  curl -sSf https://raw.githubusercontent.com/rhysd/actionlint/main/scripts/download-actionlint.bash \
    | bash -s -- latest "$tmpdir"
  install -m 0755 "$tmpdir/actionlint" "$HOME/.local/bin/actionlint" 2>/dev/null \
    || sudo install -m 0755 "$tmpdir/actionlint" /usr/local/bin/actionlint
  rm -rf "$tmpdir"
fi

echo "Cloud environment install complete."
