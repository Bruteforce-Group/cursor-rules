#!/usr/bin/env bash
set -euo pipefail

echo "Running shellcheck on scripts/*.sh (if any)..."
if compgen -G "scripts/*.sh" > /dev/null; then
  shellcheck scripts/*.sh
else
  echo "No shell scripts found; skipping shellcheck."
fi

echo "Validating Cursor rule frontmatter in .cursor/rules/*.mdc..."
python - <<'PY'
import sys
import pathlib

root = pathlib.Path(".cursor/rules")
if not root.exists():
    print("No .cursor/rules directory; skipping rule validation.")
    sys.exit(0)

errors = []
for path in sorted(root.rglob("*.mdc")):
    lines = path.read_text(encoding="utf-8").splitlines()
    if not lines:
        errors.append(f"{path}: file is empty")
        continue
    if lines[0].strip() != "---":
        errors.append(f"{path}: missing starting ---")
        continue
    try:
        end = lines[1:].index("---") + 1
    except ValueError:
        errors.append(f"{path}: missing closing --- for frontmatter")
        continue
    front = "\n".join(lines[1:end])
    if "description:" not in front:
        errors.append(f"{path}: missing description in frontmatter")
    if "globs:" not in front:
        errors.append(f"{path}: missing globs in frontmatter")

if errors:
    print("Rule format errors:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("Rule validation passed.")
PY

echo "Lint checks completed."
