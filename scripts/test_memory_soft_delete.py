#!/usr/bin/env python3
from __future__ import annotations

import datetime as dt
import tempfile
import unittest
from pathlib import Path

import memory_soft_delete


class MemorySoftDeleteTest(unittest.TestCase):
    def test_soft_delete_moves_file_and_removes_index_line(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            memory = root / "zz_memory_selftest.md"
            memory.write_text(
                "---\ntitle: Self test\n---\nBody with UTF-8: em dash - CJK memory marker.\n",
                encoding="utf-8",
            )
            (root / "MEMORY.md").write_text(
                "- [self test](zz_memory_selftest.md)\n- [keep](keep.md)\n",
                encoding="utf-8",
            )

            result = memory_soft_delete.soft_delete(
                root,
                "zz_memory_selftest.md",
                "self-test cleanup",
                now=dt.datetime(2026, 6, 3, 1, 0, tzinfo=dt.UTC),
            )

            self.assertEqual(result["status"], "soft_deleted")
            self.assertFalse(memory.exists())
            self.assertEqual((root / "MEMORY.md").read_text(encoding="utf-8"), "- [keep](keep.md)\n")

            trash = root / result["trash_path"]
            text = trash.read_text(encoding="utf-8")
            self.assertIn("deleted: true", text)
            self.assertIn('deleted_at: "2026-06-03T01:00:00Z"', text)
            self.assertIn('delete_reason: "self-test cleanup"', text)
            self.assertIn('original_path: "zz_memory_selftest.md"', text)

    def test_missing_target_is_idempotent_but_still_updates_index(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "MEMORY.md").write_text("- stale zz_memory_selftest.md\n", encoding="utf-8")

            result = memory_soft_delete.soft_delete(root, "zz_memory_selftest.md", "cleanup")

            self.assertEqual(result["status"], "already_absent")
            self.assertEqual(result["removed_lines"], 1)
            self.assertEqual((root / "MEMORY.md").read_text(encoding="utf-8"), "")

    def test_rejects_paths_outside_memory_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(ValueError):
                memory_soft_delete.soft_delete(root, "../escape.md", "bad")

    def test_gc_only_removes_expired_tombstones(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            trash = root / ".trash"
            trash.mkdir()
            old = trash / "old.md"
            new = trash / "new.md"
            old.write_text("---\ndeleted_at: \"2026-05-01T00:00:00Z\"\n---\nold\n", encoding="utf-8")
            new.write_text("---\ndeleted_at: \"2026-06-02T00:00:00Z\"\n---\nnew\n", encoding="utf-8")

            result = memory_soft_delete.garbage_collect(
                root,
                retention_days=30,
                dry_run=False,
                now=dt.datetime(2026, 6, 3, tzinfo=dt.UTC),
            )

            self.assertEqual(result["removed"], [".trash/old.md"])
            self.assertEqual(result["kept"], [".trash/new.md"])
            self.assertFalse(old.exists())
            self.assertTrue(new.exists())


if __name__ == "__main__":
    unittest.main()
