#!/usr/bin/env python3
"""Soft-delete file-backed Cursor memory entries.

The memory root is expected to contain memory Markdown files and a MEMORY.md
index. The delete operation removes the active index line, moves the file under
.trash/, and records tombstone metadata. A separate GC command can remove only
expired tombstones from .trash/.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
from pathlib import Path


TRASH_DIR = ".trash"
INDEX_FILE = "MEMORY.md"


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.UTC).replace(microsecond=0)


def parse_utc(value: str) -> dt.datetime | None:
    text = value.strip().strip('"').strip("'")
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        parsed = dt.datetime.fromisoformat(text)
    except ValueError:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=dt.UTC)
    return parsed.astimezone(dt.UTC)


def is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def yaml_quote(value: str) -> str:
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}"'


def split_frontmatter(text: str) -> tuple[list[str], str]:
    lines = text.splitlines(keepends=True)
    if not lines or lines[0].strip() != "---":
        return [], text
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            frontmatter = [line.rstrip("\n") for line in lines[1:idx]]
            body = "".join(lines[idx + 1 :])
            return frontmatter, body
    return [], text


def upsert_frontmatter(text: str, updates: dict[str, str | bool]) -> str:
    frontmatter, body = split_frontmatter(text)
    output: list[str] = []
    seen: set[str] = set()
    rendered = {
        key: ("true" if value is True else "false" if value is False else yaml_quote(str(value)))
        for key, value in updates.items()
    }

    for line in frontmatter:
        key, sep, _ = line.partition(":")
        clean_key = key.strip()
        if sep and clean_key in rendered:
            output.append(f"{clean_key}: {rendered[clean_key]}")
            seen.add(clean_key)
        else:
            output.append(line)

    for key, value in rendered.items():
        if key not in seen:
            output.append(f"{key}: {value}")

    return "---\n" + "\n".join(output) + "\n---\n" + body


def resolve_memory_file(root: Path, relative_path: str) -> tuple[Path, Path]:
    memory_root = root.expanduser().resolve()
    target = (memory_root / relative_path).resolve()
    if not is_relative_to(target, memory_root):
        raise ValueError(f"refusing path outside memory root: {relative_path}")
    rel = target.relative_to(memory_root)
    if rel.parts[0] == TRASH_DIR:
        raise ValueError("refusing to delete an entry already under .trash")
    if target.name == INDEX_FILE:
        raise ValueError("refusing to delete MEMORY.md through memory soft-delete")
    if target.suffix.lower() != ".md":
        raise ValueError("memory soft-delete only accepts .md files")
    return memory_root, target


def line_references_entry(line: str, rel: Path) -> bool:
    rel_posix = rel.as_posix()
    if rel_posix in line or f"./{rel_posix}" in line:
        return True
    return len(rel.parts) == 1 and rel.name in line


def remove_index_entry(memory_root: Path, rel: Path) -> dict[str, int | bool]:
    index_path = memory_root / INDEX_FILE
    if not index_path.exists():
        return {"index_exists": False, "removed_lines": 0}

    lines = index_path.read_text(encoding="utf-8").splitlines(keepends=True)
    kept = [line for line in lines if not line_references_entry(line, rel)]
    removed = len(lines) - len(kept)
    if removed:
        index_path.write_text("".join(kept), encoding="utf-8")
    return {"index_exists": True, "removed_lines": removed}


def unique_trash_path(memory_root: Path, rel: Path, deleted_at: dt.datetime) -> Path:
    base = memory_root / TRASH_DIR / rel
    if not base.exists():
        return base
    stamp = deleted_at.strftime("%Y%m%dT%H%M%SZ")
    candidate = base.with_name(f"{base.stem}.{stamp}{base.suffix}")
    counter = 1
    while candidate.exists():
        candidate = base.with_name(f"{base.stem}.{stamp}.{counter}{base.suffix}")
        counter += 1
    return candidate


def soft_delete(root: Path, relative_path: str, reason: str, now: dt.datetime | None = None) -> dict:
    deleted_at = now or utc_now()
    memory_root, target = resolve_memory_file(root, relative_path)
    rel = target.relative_to(memory_root)
    index_result = remove_index_entry(memory_root, rel)

    if not target.exists():
        return {
            "ok": True,
            "status": "already_absent",
            "path": rel.as_posix(),
            **index_result,
        }

    trash_path = unique_trash_path(memory_root, rel, deleted_at)
    trash_path.parent.mkdir(parents=True, exist_ok=True)
    tombstoned = upsert_frontmatter(
        target.read_text(encoding="utf-8"),
        {
            "deleted": True,
            "deleted_at": deleted_at.isoformat().replace("+00:00", "Z"),
            "delete_reason": reason,
            "original_path": rel.as_posix(),
        },
    )
    trash_path.write_text(tombstoned, encoding="utf-8")
    target.unlink()

    return {
        "ok": True,
        "status": "soft_deleted",
        "path": rel.as_posix(),
        "trash_path": trash_path.relative_to(memory_root).as_posix(),
        **index_result,
    }


def tombstone_deleted_at(path: Path) -> dt.datetime | None:
    frontmatter, _ = split_frontmatter(path.read_text(encoding="utf-8"))
    for line in frontmatter:
        key, sep, value = line.partition(":")
        if sep and key.strip() == "deleted_at":
            return parse_utc(value)
    return None


def garbage_collect(root: Path, retention_days: int, dry_run: bool, now: dt.datetime | None = None) -> dict:
    memory_root = root.expanduser().resolve()
    trash_root = memory_root / TRASH_DIR
    cutoff = (now or utc_now()) - dt.timedelta(days=retention_days)
    removed: list[str] = []
    kept: list[str] = []

    if not trash_root.exists():
        return {"ok": True, "removed": removed, "kept": kept}

    for path in sorted(trash_root.rglob("*.md")):
        if not path.is_file():
            continue
        deleted_at = tombstone_deleted_at(path)
        rel = path.relative_to(memory_root).as_posix()
        if deleted_at is None or deleted_at > cutoff:
            kept.append(rel)
            continue
        removed.append(rel)
        if not dry_run:
            path.unlink()

    if not dry_run:
        for directory in sorted((p for p in trash_root.rglob("*") if p.is_dir()), reverse=True):
            try:
                directory.rmdir()
            except OSError:
                pass

    return {"ok": True, "removed": removed, "kept": kept, "dry_run": dry_run}


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    delete_parser = subparsers.add_parser("delete", help="soft-delete a memory file")
    delete_parser.add_argument("--root", required=True, type=Path, help="memory root containing MEMORY.md")
    delete_parser.add_argument("--path", required=True, help="memory file path relative to root")
    delete_parser.add_argument("--reason", default="soft-delete requested", help="tombstone delete reason")

    gc_parser = subparsers.add_parser("gc", help="remove expired tombstones from .trash")
    gc_parser.add_argument("--root", required=True, type=Path, help="memory root containing .trash")
    gc_parser.add_argument("--retention-days", type=int, default=30, help="minimum tombstone age to hard-delete")
    gc_parser.add_argument("--dry-run", action="store_true", help="report expired tombstones without unlinking")

    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        if args.command == "delete":
            result = soft_delete(args.root, args.path, args.reason)
        else:
            result = garbage_collect(args.root, args.retention_days, args.dry_run)
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, sort_keys=True))
        return 1

    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
