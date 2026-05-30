#!/usr/bin/env python3
"""Self-managed static documentation generator.

Renders docs/*.md into a static HTML site under site/ using a single
HTML template and a self-managed nav (docs/nav.json). No third-party
docs SaaS — the only dependency is the `markdown` package.

Usage:
  python3 scripts/build_docs.py            # build into ./site
  python3 scripts/build_docs.py --out dir  # custom output directory

Each page must start with YAML-ish frontmatter:
  ---
  title: "..."
  description: "..."
  ---
"""
from __future__ import annotations

import argparse
import json
import pathlib
import re
import shutil
import sys

try:
    import markdown
except ImportError:
    sys.exit(
        "ERROR: the 'markdown' package is required.\n"
        "Install it with: pip install -r requirements-docs.txt"
    )

ROOT = pathlib.Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
THEME = DOCS / "theme"
NAV_FILE = DOCS / "nav.json"

FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n", re.DOTALL)
# Rewrite relative .md links to clean (extensionless) URLs that match
# Cloudflare Static Assets' default auto-trim behaviour (avoids 307 redirects).
MD_LINK_RE = re.compile(r'href="(?!https?:|mailto:|/|#)([^"]+?)\.md(#[^"]*)?"')


def _clean_link(match: re.Match) -> str:
    base = match.group(1)
    frag = match.group(2) or ""
    if base == "index":
        return f'href="/{frag}"' if frag else 'href="/"'
    return f'href="/{base}{frag}"'


def parse_frontmatter(text: str) -> tuple[dict, str]:
    match = FRONTMATTER_RE.match(text)
    meta: dict[str, str] = {}
    if not match:
        return meta, text
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip().strip('"').strip("'")
    return meta, text[match.end():]


def build_nav(nav: dict, active_slug: str) -> str:
    out = [f'<div class="nav-group-title">{nav.get("title", "Docs")}</div>', "<ul>"]
    for group in nav.get("groups", []):
        if group.get("group"):
            out.append(f'<li class="nav-group-title">{group["group"]}</li>')
        for page in group.get("pages", []):
            slug = page["slug"]
            href = "/" if slug == "index" else f"/{slug}"
            cls = ' class="active"' if slug == active_slug else ""
            out.append(f'<li><a href="{href}"{cls}>{page["title"]}</a></li>')
    out.append("</ul>")
    return "\n".join(out)


def render_template(template: str, **fields: str) -> str:
    html = template
    for key, value in fields.items():
        html = html.replace("{{" + key + "}}", value)
    return html


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(ROOT / "site"))
    args = ap.parse_args()
    out_dir = pathlib.Path(args.out)

    if not NAV_FILE.exists():
        sys.exit(f"ERROR: {NAV_FILE} not found")
    nav = json.loads(NAV_FILE.read_text(encoding="utf-8"))
    template = (THEME / "template.html").read_text(encoding="utf-8")
    site_title = nav.get("title", "Documentation")

    slugs = [p["slug"] for g in nav.get("groups", []) for p in g.get("pages", [])]
    if not slugs:
        sys.exit("ERROR: nav.json lists no pages")

    out_dir.mkdir(parents=True, exist_ok=True)
    # Clean previously generated HTML so deletions propagate.
    for stale in out_dir.glob("*.html"):
        stale.unlink()

    md = markdown.Markdown(
        extensions=["fenced_code", "tables", "toc", "sane_lists", "attr_list"]
    )

    built = 0
    for slug in slugs:
        src = DOCS / f"{slug}.md"
        if not src.exists():
            sys.exit(f"ERROR: nav references missing page: {src}")
        meta, body = parse_frontmatter(src.read_text(encoding="utf-8"))
        md.reset()
        content_html = md.convert(body)
        content_html = MD_LINK_RE.sub(_clean_link, content_html)
        toc_html = md.toc if md.toc.strip() else ""
        toc_block = f'<div class="toc-title">On this page</div>{toc_html}' if toc_html else ""

        page_html = render_template(
            template,
            site_title=site_title,
            title=meta.get("title", slug),
            description=meta.get("description", ""),
            nav=build_nav(nav, slug),
            toc=toc_block,
            content=content_html,
        )
        dest = out_dir / ("index.html" if slug == "index" else f"{slug}.html")
        dest.write_text(page_html, encoding="utf-8")
        built += 1

    shutil.copyfile(THEME / "styles.css", out_dir / "styles.css")

    assets_src = DOCS / "assets"
    if assets_src.is_dir():
        shutil.copytree(assets_src, out_dir / "assets", dirs_exist_ok=True)

    # Minimal 404 page (paired with not_found_handling = "404-page").
    (out_dir / "404.html").write_text(
        render_template(
            template,
            site_title=site_title,
            title="Page not found",
            description="The page you requested does not exist.",
            nav=build_nav(nav, ""),
            toc="",
            content='<p>Try the <a href="/">documentation home</a>.</p>',
        ),
        encoding="utf-8",
    )

    print(f"Built {built} page(s) + 404 into {out_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
