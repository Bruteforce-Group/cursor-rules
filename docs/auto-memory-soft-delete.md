---
title: "Auto-memory soft delete"
description: "Delete file-backed memory entries by tombstoning them and garbage-collecting expired trash."
---

## Purpose

File-backed auto-memory stores active entries as Markdown files plus a `MEMORY.md`
index. Agents may be able to create, edit, and index those files while still
lacking host permission to unlink them directly. The safe delete lifecycle is
therefore a soft delete:

1. Remove the active pointer from `MEMORY.md`.
2. Move the target memory file under `.trash/` in the same memory root.
3. Add tombstone metadata to the moved file.
4. Let a retention-aware garbage collector hard-delete expired tombstones later.

## Helper

Use `scripts/memory_soft_delete.py` when the memory root is mounted:

```bash
python3 scripts/memory_soft_delete.py delete \
  --root /path/to/spaces/example/memory \
  --path zz_memory_selftest.md \
  --reason "self-test cleanup"
```

The command is constrained to `.md` files inside the memory root and refuses
paths outside the root, `.trash/` targets, and `MEMORY.md` itself.

## Garbage Collection

Hard deletion is limited to expired tombstones under `.trash/`:

```bash
python3 scripts/memory_soft_delete.py gc \
  --root /path/to/spaces/example/memory \
  --retention-days 30 \
  --dry-run
```

Remove `--dry-run` only after reviewing the reported tombstones.

## Tombstone Metadata

Soft-deleted files receive frontmatter like:

```yaml
deleted: true
deleted_at: "2026-06-03T01:00:00Z"
delete_reason: "self-test cleanup"
original_path: "zz_memory_selftest.md"
```

This keeps recall/index clean while preserving an audit trail until GC runs.
