#!/usr/bin/env bash
set -euo pipefail

# Bump rule versions across all .mdc files, README table, and VERSION file.
# Usage: bump_rule_versions.sh [new_version]
# If new_version is omitted, bumps patch from VERSION.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$ROOT/VERSION"

current() {
  cat "$VERSION_FILE"
}

bump_patch() {
  local v="$1"
  IFS='.' read -r major minor patch <<<"$v"
  patch=$((patch + 1))
  echo "${major}.${minor}.${patch}"
}

new_version="${1:-}"
if [ -z "$new_version" ]; then
  new_version="$(bump_patch "$(current)")"
fi

echo "$new_version" > "$VERSION_FILE"

echo "Setting version=$new_version in .mdc rule files..."
python - <<PY
import pathlib, re, sys
root = pathlib.Path("$ROOT/.cursor/rules")
target = "$new_version"
for path in root.rglob("*.mdc"):
    text = path.read_text(encoding="utf-8")
    if "version:" in text:
        text = re.sub(r"^version:.*$", f"version: {target}", text, flags=re.MULTILINE)
    else:
        lines = text.splitlines()
        # insert after description line
        for i, line in enumerate(lines):
            if line.strip().startswith("description:"):
                lines.insert(i+1, f"version: {target}")
                break
        text = "\n".join(lines)
    path.write_text(text, encoding="utf-8")
PY

README="$ROOT/README.md"
if [ -f "$README" ]; then
  python - <<PY
import re, pathlib
readme = pathlib.Path("$README")
text = readme.read_text(encoding="utf-8")
def repl(match):
    name = match.group(1)
    return f"| {name} | {match.group(2).split('|')[2].strip()} |"
text = re.sub(r"\| ([^|]+) \| ([0-9]+\.[0-9]+\.[0-9]+) \|", lambda m: f"| {m.group(1)} | {target} |", text)
readme.write_text(text, encoding="utf-8")
PY
fi

python - <<PY
import json, pathlib
root = pathlib.Path("$ROOT")
manifest = root/".governance/versions.json"
target = "$new_version"
if manifest.exists():
    data = json.loads(manifest.read_text(encoding="utf-8"))
else:
    data = {}
data["repoVersion"] = target
for path in (root/".cursor/rules").rglob("*.mdc"):
    name = path.stem
    data[name] = target
manifest.parent.mkdir(parents=True, exist_ok=True)
manifest.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
PY

echo "Bumped all rule versions to $new_version"
