#!/usr/bin/env python3
"""Self-managed documentation link & asset checker.

Replaces `mintlify broken-links`. Validates, with zero third-party
dependencies:
  - every page in docs/nav.json exists
  - every nav page has title + description frontmatter
  - internal Markdown links resolve to a real page/anchor/asset
  - internal image references resolve to a real file and have alt text

Exit code 1 (with a report) if any problem is found.

Usage: python3 scripts/check_docs_links.py
"""
from __future__ import annotations

import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
NAV_FILE = DOCS / "nav.json"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
LINK_RE = re.compile(r"(?<!\!)\[[^\]]*\]\(([^)]+)\)")
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
HEADING_RE = re.compile(r"^#{1,6}\s+(.*)$", re.MULTILINE)
EXTERNAL = ("http://", "https://", "mailto:", "tel:")


def slugify(heading: str) -> str:
    text = re.sub(r"`|\*|_", "", heading).strip().lower()
    text = re.sub(r"[^\w\s-]", "", text)
    return re.sub(r"[\s]+", "-", text)


def frontmatter(text: str) -> dict:
    match = FRONTMATTER_RE.match(text)
    meta: dict[str, str] = {}
    if not match:
        return meta
    for line in match.group(1).splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip().strip('"').strip("'")
    return meta


def anchors_for(md_file: pathlib.Path) -> set[str]:
    text = md_file.read_text(encoding="utf-8")
    return {slugify(h) for h in HEADING_RE.findall(text)}


def main() -> int:
    errors: list[str] = []

    if not NAV_FILE.exists():
        print(f"ERROR: {NAV_FILE} not found")
        return 1
    nav = json.loads(NAV_FILE.read_text(encoding="utf-8"))
    nav_slugs = {p["slug"] for g in nav.get("groups", []) for p in g.get("pages", [])}

    # Anchor map for cross-page #fragment validation.
    anchors: dict[str, set[str]] = {}
    for md_file in DOCS.glob("*.md"):
        anchors[md_file.stem] = anchors_for(md_file)

    # 1) Nav pages exist + have required frontmatter.
    for slug in sorted(nav_slugs):
        page = DOCS / f"{slug}.md"
        if not page.exists():
            errors.append(f"nav.json references missing page: docs/{slug}.md")
            continue
        meta = frontmatter(page.read_text(encoding="utf-8"))
        for field in ("title", "description"):
            if not meta.get(field):
                errors.append(f"docs/{slug}.md: missing frontmatter '{field}'")

    # 2) Links and images inside each page.
    for md_file in sorted(DOCS.glob("*.md")):
        text = md_file.read_text(encoding="utf-8")

        for alt, src in IMAGE_RE.findall(text):
            if not alt.strip():
                errors.append(f"{md_file.name}: image missing alt text -> ({src})")
            if src.startswith(EXTERNAL) or src.startswith("data:"):
                continue
            target = (md_file.parent / src.split("#")[0]).resolve()
            if not target.exists():
                errors.append(f"{md_file.name}: image not found -> {src}")

        for href in LINK_RE.findall(text):
            href = href.strip()
            if href.startswith(EXTERNAL):
                continue
            path_part, _, frag = href.partition("#")

            if not path_part:  # same-page anchor
                if frag and frag not in anchors.get(md_file.stem, set()):
                    errors.append(f"{md_file.name}: broken same-page anchor -> #{frag}")
                continue

            base = path_part[:-3] if path_part.endswith(".md") else path_part
            base = base.strip("/")

            if path_part.endswith(".md") or base in nav_slugs:
                if base not in anchors:
                    errors.append(f"{md_file.name}: link to missing page -> {href}")
                elif frag and frag not in anchors[base]:
                    errors.append(f"{md_file.name}: broken anchor -> {href}")
            else:
                target = (md_file.parent / path_part).resolve()
                if not target.exists():
                    errors.append(f"{md_file.name}: broken link/asset -> {href}")

    if errors:
        print(f"Found {len(errors)} documentation issue(s):")
        for e in errors:
            print(f" - {e}")
        return 1

    page_count = len(list(DOCS.glob("*.md")))
    print(f"Docs link check passed ({page_count} pages, {len(nav_slugs)} in nav).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
