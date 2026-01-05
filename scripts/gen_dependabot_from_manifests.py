#!/usr/bin/env python3
"""
Generate .github/dependabot.yml entries by discovering manifests.
Supports npm (package.json), pip (requirements*.txt), gomod (go.mod), and github-actions.
Writes a new dependabot.yml with weekly schedule, labels, major ignored.
"""
import pathlib
import sys
import yaml

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / ".github" / "dependabot.yml"

ECOSYSTEMS = {
    "npm": ["package.json"],
    "pip": ["requirements.txt", "requirements-dev.txt", "requirements/*.txt"],
    "gomod": ["go.mod"],
}

def find_dirs(patterns):
    dirs = set()
    for pat in patterns:
        for path in ROOT.glob("**/" + pat):
            if any(p in path.parts for p in [".git", "node_modules", ".venv", "vendor"]):
                continue
            dirs.add("/" + str(path.parent.relative_to(ROOT)))
    return sorted(dirs)

def main():
    updates = []
    # GitHub Actions
    updates.append({
        "package-ecosystem": "github-actions",
        "directory": "/",
        "schedule": {"interval": "weekly"},
        "labels": ["dependencies", "security"],
        "open-pull-requests-limit": 5,
        "ignore": [{"dependency-name": "*", "update-types": ["version-update:semver-major"]}],
        "commit-message": {"prefix": "chore", "include": "scope"},
    })

    for eco, patterns in ECOSYSTEMS.items():
        dirs = find_dirs(patterns)
        if not dirs:
            continue
        for d in dirs:
            updates.append({
                "package-ecosystem": eco,
                "directory": d,
                "schedule": {"interval": "weekly"},
                "labels": ["dependencies"],
                "open-pull-requests-limit": 5,
                "ignore": [{"dependency-name": "*", "update-types": ["version-update:semver-major"]}],
                "commit-message": {"prefix": "chore", "include": "scope"},
            })

    if not updates:
        print("No manifests found; not writing dependabot.yml", file=sys.stderr)
        sys.exit(0)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        yaml.dump({"version": 2, "updates": updates}, f, sort_keys=False)
    print(f"Wrote {OUT} with {len(updates)} update blocks.")

if __name__ == "__main__":
    main()
