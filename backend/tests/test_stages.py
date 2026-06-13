"""
Unit tests for Stage 1, Stage 2, and Stage 3 in isolation.

Each test creates temporary files using pytest's tmp_path fixture so
there's no dependency on demo data being present.
"""

from __future__ import annotations

import os
import pytest

from app.core.stage1_size import group_by_size
from app.core.stage2_partial import compute_partial_hash
from app.core.stage3_full import compute_full_hash


def _make_file(path, content: bytes) -> str:
    """Write *content* to *path* and return the absolute path string."""
    path.write_bytes(content)
    return str(path)


def _fresh_state() -> dict:
    return {"status": "running", "files_scanned": 0, "total_files": 0}


# ── Stage 1 ──────────────────────────────────────────────────────────────────

class TestGroupBySize:
    def test_groups_same_size_files(self, tmp_path):
        """Files with identical sizes end up in the same bucket."""
        f1 = _make_file(tmp_path / "a.txt", b"x" * 100)
        f2 = _make_file(tmp_path / "b.txt", b"y" * 100)
        f3 = _make_file(tmp_path / "c.txt", b"z" * 200)

        groups, skipped, total = group_by_size(str(tmp_path), _fresh_state())

        assert 100 in groups
        assert sorted(groups[100]) == sorted([f1, f2])
        assert 200 not in groups  # singleton — dropped
        assert total == 3
        assert skipped == []

    def test_discards_singletons(self, tmp_path):
        """A size bucket with one member is not a candidate — must be dropped."""
        _make_file(tmp_path / "unique.bin", b"u" * 512)
        groups, _, _ = group_by_size(str(tmp_path), _fresh_state())
        assert groups == {}

    def test_empty_files_are_grouped(self, tmp_path):
        """Two zero-byte files are valid duplicates and must be kept."""
        _make_file(tmp_path / "e1.txt", b"")
        _make_file(tmp_path / "e2.txt", b"")
        groups, _, _ = group_by_size(str(tmp_path), _fresh_state())
        assert 0 in groups
        assert len(groups[0]) == 2

    def test_four_files_two_sizes(self, tmp_path):
        """Spec example: sizes [0, 100, 100, 200] → one group {100: [f2, f3]}."""
        f0 = _make_file(tmp_path / "f0.txt", b"")
        f2 = _make_file(tmp_path / "f2.txt", b"a" * 100)
        f3 = _make_file(tmp_path / "f3.txt", b"b" * 100)
        f4 = _make_file(tmp_path / "f4.txt", b"c" * 200)

        groups, _, total = group_by_size(str(tmp_path), _fresh_state())

        # sizes 0 and 200 are singletons — only size 100 survives
        assert set(groups.keys()) == {100}
        assert sorted(groups[100]) == sorted([f2, f3])
        assert total == 4


# ── Stage 2 ──────────────────────────────────────────────────────────────────

class TestPartialHash:
    def test_same_content_same_hash(self, tmp_path):
        """Identical content must produce identical partial hashes."""
        f1 = _make_file(tmp_path / "p1.bin", b"abc" * 1000)
        f2 = _make_file(tmp_path / "p2.bin", b"abc" * 1000)
        assert compute_partial_hash(f1, 65536) == compute_partial_hash(f2, 65536)

    def test_different_content_different_hash(self, tmp_path):
        """Two files of the same size but different content must differ."""
        f1 = _make_file(tmp_path / "d1.bin", b"A" * 100)
        f2 = _make_file(tmp_path / "d2.bin", b"B" * 100)
        assert compute_partial_hash(f1, 65536) != compute_partial_hash(f2, 65536)

    def test_chunk_boundary_respected(self, tmp_path):
        """Only the first chunk_size bytes are hashed — tail differences are ignored."""
        common_prefix = b"X" * 100
        f1 = _make_file(tmp_path / "c1.bin", common_prefix + b"TAIL_A")
        f2 = _make_file(tmp_path / "c2.bin", common_prefix + b"TAIL_B")
        # chunk_size=100 means only the prefix is read
        assert compute_partial_hash(f1, 100) == compute_partial_hash(f2, 100)


# ── Stage 3 ──────────────────────────────────────────────────────────────────

class TestFullHash:
    def test_identical_files_same_sha256(self, tmp_path):
        """Full hash must confirm two genuinely identical files."""
        content = b"hello duplicate world\n" * 500
        f1 = _make_file(tmp_path / "orig.bin", content)
        f2 = _make_file(tmp_path / "copy.bin", content)
        assert compute_full_hash(f1) == compute_full_hash(f2)

    def test_hash_prefixed_with_sha256(self, tmp_path):
        """Output format must be 'sha256:<hex>' as required by the API spec."""
        f = _make_file(tmp_path / "h.txt", b"data")
        result = compute_full_hash(f)
        assert result.startswith("sha256:")
        assert len(result) == len("sha256:") + 64  # SHA-256 = 64 hex chars

    def test_different_files_different_sha256(self, tmp_path):
        """Files with even a single byte difference must have different hashes."""
        f1 = _make_file(tmp_path / "x.bin", b"A" * 1000)
        f2 = _make_file(tmp_path / "y.bin", b"A" * 999 + b"B")
        assert compute_full_hash(f1) != compute_full_hash(f2)
