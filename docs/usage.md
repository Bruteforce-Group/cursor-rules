---
title: "Using the rules"
description: "Add these Cursor rules to a project and author documentation pages for this site."
---

## Apply the rules in a project

You have two options:

1. **User-level (all workspaces):** run `./scripts/sync-to-user-rules.sh --force`
   to copy every rule into `~/.cursor/rules/`. Cursor then loads them in every
   workspace automatically.
2. **Project-level:** copy `.cursor/rules/` into the target repo, or symlink it
   to a checkout of this repo. Keep the `globs` in each `.mdc` aligned with the
   repo's layout (backend paths, frontend paths, and so on).

Commit the rules so CI and teammates pick them up.

## Author a documentation page

Documentation lives in `docs/` as Markdown. To add a page:

1. Create `docs/<slug>.md` starting with frontmatter:

```markdown
---
title: "Clear, specific title"
description: "One sentence on the page's purpose."
---

Your content here.
```

2. Register the page in `docs/nav.json` so it shows in the sidebar:

```json
{ "slug": "my-page", "title": "My page" }
```

3. Link between pages with relative `.md` links, for example
   `[the CI workflow](ci-workflow.md)`. The build rewrites these to `.html` and
   the link checker fails the build if a target is missing.

## Build and preview locally

```bash
pip install -r requirements-docs.txt
python3 scripts/check_docs_links.py
python3 scripts/build_docs.py
# open ./site/index.html in a browser
```

## Best practices

- Update rule `globs` when your project structure changes.
- Add `title` and `description` frontmatter to every page — the checker requires both.
- Keep `nav.json` and the files in sync; a nav entry without a matching file fails CI.
