#!/usr/bin/env bash
set -euo pipefail

# Ensures rule versions are consistent across:
# - VERSION file
# - .cursor/rules/*.mdc frontmatter
# - .governance/versions.json (baseline)
#
# Fails if:
# - VERSION missing or empty
# - any .mdc missing version or version mismatch with VERSION
# - baseline exists but differs from current versions

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.."\ &&\ pwd)"
VERSION_FILE="$ROOT/VERSION"
MANIFEST="$ROOT/.governance/versions.json"

if [ ! -s "$VERSION_FILE" ]; then
  echo "VERSION file missing or empty" >&2
  exit 1
fi
VERSION_VAL="$(cat "$VERSION_FILE")"

tmp="$(mktemp)"
python3 - <<PY
import json, pathlib, re, sys
root = pathlib.Path("$ROOT")
version = "$VERSION_VAL"
versions = {"repoVersion": version}
errors = []
for path in sorted((root/".cursor/rules").rglob("*.mdc")):
    text = path.read_text(encoding="utf-8")
    m = re.search(r"^version:\s*([0-9]+\.[0-9]+\.[0-9]+)", text, flags=re.MULTILINE)
    if not m:
        errors.append(f"{path}: missing version")
        continue
    v = m.group(1)
    versions[path.stem] = v
    if v != version:
        errors.append(f"{path}: version {v} does not match repo VERSION {version}")

if errors:
    print("Version check errors:")
    for e in errors:
        print(" -", e)
    sys.exit(1)

manifest = pathlib.Path("$MANIFEST")
if manifest.exists():
    baseline = json.loads(manifest.read_text(encoding="utf-8"))
    mismatches = []
    for key, val in versions.items():
        base = baseline.get(key)
        if base is None:
            mismatches.append(f"{key}: missing in baseline")
        elif base != val:
            mismatches.append(f"{key}: baseline {base} != current {val}")
    if mismatches:
        print("Baseline version mismatches:")
        for m in mismatches:
            print(" -", m)
        sys.exit(1)

pathlib.Path("$tmp").write_text(json.dumps(versions, indent=2) + "\n", encoding="utf-8")
PY

echo "Rule versions OK (repo VERSION=$VERSION_VAL)"
echo "Current versions:"
cat "$tmp"
rm -f "$tmp"
