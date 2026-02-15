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
import ast

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
    else:
        try:
            desc_val = None
            for line in front.splitlines():
                if line.strip().startswith("description:"):
                    desc_val = line.split("description:", 1)[1].strip()
                    break
            if desc_val is None or not desc_val:
                raise ValueError("empty description")
            if len(desc_val) < 8:
                raise ValueError("description too short (min 8 chars)")
            if len(desc_val) > 160:
                raise ValueError("description too long (max 160 chars)")
        except Exception as e:
            errors.append(f"{path}: invalid description ({e})")
    # Determine if rule is always-applied (universal rules may omit globs)
    is_always_apply = any(
        line.strip().startswith("alwaysApply") and "true" in line.split(":", 1)[1].lower()
        for line in front.splitlines()
        if "alwaysApply" in line
    )

    if "globs:" not in front:
        if not is_always_apply:
            errors.append(f"{path}: missing globs in frontmatter (required unless alwaysApply: true)")
    else:
        # Simple schema check: globs should parse as a list (YAML superset) and contain only strings
        try:
            # Parse globs value: supports inline lists, multi-line JSON arrays, and YAML block lists
            globs_lines = []
            capture = False
            bracket_open = False
            for line in front.splitlines():
                if line.strip().startswith("globs:"):
                    rest = line.split("globs:", 1)[1].strip()
                    if "[" in rest and "]" in rest:
                        # Inline single-line list: globs: ["a/**", "b/**"]
                        globs_lines.append(rest)
                        break
                    elif "[" in rest:
                        # Multi-line list starting on globs: line
                        globs_lines.append(rest)
                        bracket_open = True
                        capture = True
                    else:
                        # YAML-style block list follows
                        capture = True
                    continue
                if capture:
                    globs_lines.append(line)
                    if bracket_open and "]" in line:
                        break
                    elif not bracket_open:
                        # YAML block: stop at non-indented, non-list line
                        if line and not line.startswith(" ") and not line.strip().startswith("-"):
                            break
            globs_text = "\n".join(globs_lines).strip()
            if not globs_text:
                raise ValueError("globs is empty")
            # Normalize to Python literal list
            if globs_text.startswith("["):
                literal = globs_text
            else:
                # convert YAML-style block list to Python list literal
                items = []
                for line in globs_text.splitlines():
                    line = line.strip()
                    if line.startswith("-"):
                        item = line.lstrip("-").strip()
                        items.append(f"{item}")
                literal = "[" + ",".join(items) + "]"
            globs_val = ast.literal_eval(literal)
            if not isinstance(globs_val, list) or not globs_val:
                raise ValueError("globs must be a non-empty list")
            if len(globs_val) < 1:
                raise ValueError("globs must include at least one entry")
            if not all(isinstance(x, str) and x.strip() for x in globs_val):
                raise ValueError("globs entries must be non-empty strings")
            if not any("/" in x or "**" in x for x in globs_val):
                raise ValueError("globs must include at least one scoped pattern (e.g., path/ or **/)")
            if any(x.strip() in {"*", "**"} for x in globs_val):
                raise ValueError("globs must not contain bare * or **")
            if not any(x.startswith(prefix) for x in globs_val for prefix in ("apps/", "packages/", "services/", "modules/")):
                raise ValueError("globs must include at least one org-level path (apps/, packages/, services/, or modules/)")
        except Exception as e:
            errors.append(f"{path}: invalid globs schema ({e})")
    if "alwaysApply" not in front:
        errors.append(f"{path}: missing alwaysApply in frontmatter")
    else:
        try:
            for line in front.splitlines():
                if line.strip().startswith("alwaysApply"):
                    val = line.split(":", 1)[1].strip().lower()
                    if val not in {"true", "false"}:
                        raise ValueError(f"alwaysApply must be true/false, got {val}")
                    break
        except Exception as e:
            errors.append(f"{path}: invalid alwaysApply ({e})")

if errors:
    print("Rule format errors:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("Rule validation passed.")
PY

echo "Validating YAML files..."
python - <<'PY'
import sys, pathlib, yaml
roots = [pathlib.Path(".")]
errors = []
for root in roots:
    for path in sorted(root.rglob("*.yml")) + sorted(root.rglob("*.yaml")):
        # Skip common binary/venv/vendor dirs
        parts = set(path.parts)
        if {"node_modules", ".git", ".venv"}.intersection(parts):
            continue
        try:
            yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{path}: {e}")
if errors:
    print("YAML validation errors:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("YAML validation passed.")
PY

echo "Validating JSON files..."
python - <<'PY'
import sys, pathlib, json
errors = []
for path in sorted(pathlib.Path(".").rglob("*.json")):
    parts = set(path.parts)
    if {"node_modules", ".git", ".venv"}.intersection(parts):
        continue
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        errors.append(f"{path}: {e}")
if errors:
    print("JSON validation errors:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("JSON validation passed.")
PY

echo "Checking Markdown links for empty targets..."
python - <<'PY'
import re, sys, pathlib
errors = []
link_pattern = re.compile(r'\[([^\]]+)\]\(([^)]+)\)')
for path in sorted(pathlib.Path(".").rglob("*.md")):
    if any(p in {"node_modules", ".git", ".venv"} for p in path.parts):
        continue
    for lineno, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        for match in link_pattern.finditer(line):
            target = match.group(2).strip()
            if target == "" or target.lower().startswith("javascript:"):
                errors.append(f"{path}:{lineno} has empty/invalid link target")
if errors:
    print("Markdown link issues:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("Markdown link check passed.")
PY

echo "Checking for committed .env files..."
if find . -path "./.git" -prune -o -path "./node_modules" -prune -o -path "./.venv" -prune -o -name ".env*" -print | grep -v '^./.git' | grep -q .; then
  echo "Found committed .env* files. Remove them or move to secrets management." >&2
  exit 1
fi
echo ".env check passed."

echo "Lint checks completed."
