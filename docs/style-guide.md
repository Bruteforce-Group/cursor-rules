---
title: "Writing style guide"
description: "Plain-Markdown conventions for documentation in this self-managed site."
---

These conventions keep our Markdown portable, accessible, and easy to render
with the self-managed generator. They replace the previous Mintlify component
guidance — write standard Markdown only.

## Voice and structure

- Write in second person ("you") with active voice and present tense.
- Lead with the most important information (inverted pyramid).
- Break procedures into numbered steps with expected outcomes.
- Use descriptive, keyword-rich headings starting at `##` (the page `title`
  renders as the `<h1>`).
- Define jargon on first use and keep terminology consistent.

## Frontmatter

Every page begins with `title` and `description`:

```markdown
---
title: "Clear, specific, keyword-rich title"
description: "Concise description of the page's purpose."
---
```

## Code

- Use fenced code blocks with a language hint for highlighting and clarity.
- Show complete, runnable examples with realistic data — no placeholder filler.
- Never include real secrets, API keys, or credentials.

```bash
python3 scripts/build_docs.py
```

## Links and media

- Link between pages with relative `.md` links, e.g. `[usage](usage.md)`; the
  build rewrites them to `.html`.
- Use specific link text, never "click here".
- Store images under `docs/assets/` and reference them relatively. Every image
  needs descriptive alt text — the link checker enforces this.

## Tables and callouts

- Use standard Markdown tables for structured comparisons.
- For emphasis, use blockquotes rather than framework-specific callout
  components:

> Note: blockquotes render as styled callouts in the theme and stay readable
> as plain Markdown on GitHub.

## Accessibility

- Descriptive alt text on every image.
- Proper heading hierarchy (no skipped levels).
- Specific, meaningful link text.
