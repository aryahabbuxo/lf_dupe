"""
Demo data generator.

Usage:
  python scripts/setup_demo.py --size=small   # ~100 MB in demo_data_small/
  python scripts/setup_demo.py --size=full    # ~17 GB in demo_data/ (gitignored)

The generated tree is designed to exercise every stage of the pipeline:
  - Size-unique files   → eliminated in Stage 1
  - Same-size, diff-content files → eliminated in Stage 2
  - Genuine duplicates  → confirmed in Stage 3
  - Empty files         → edge case for Stage 1
  - Symlinks            → created but should be ignored (follow_symlinks=False)
  - Nested directories  → tests recursive walk
"""

from __future__ import annotations

import argparse
import os
import random
import shutil
import string
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
SMALL_DIR = REPO_ROOT / "demo_data_small"
FULL_DIR = REPO_ROOT / "demo_data"


def _write_file(path: Path, size_bytes: int, seed: int = 0) -> None:
    """Write *size_bytes* of pseudo-random data to *path* using *seed*."""
    path.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(seed)
    chunk = 65536
    written = 0
    with open(path, "wb") as fh:
        while written < size_bytes:
            to_write = min(chunk, size_bytes - written)
            fh.write(bytes(rng.getrandbits(8) for _ in range(to_write)))
            written += to_write


def _copy_file(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def build_small(out: Path) -> None:
    """
    Generate ~100 MB of demo data for quick testing.

    Tree:
      documents/   — 5 text files, 2 duplicate pairs
      images/      — 10 files of ~5 MB each, 3 duplicate pairs
      misc/        — empty files, same-size-different-content
      nested/      — deep directory with duplicates
    """
    print(f"Generating small demo data in {out} …")
    if out.exists():
        shutil.rmtree(out)

    # ── Documents: small text duplicates ─────────────────────────────────────
    doc = out / "documents"
    _write_text(doc / "report.txt", "Annual report content\n" * 200)
    _copy_file(doc / "report.txt", doc / "report_backup.txt")
    _write_text(doc / "notes.txt", "Meeting notes\n" * 150)
    _copy_file(doc / "notes.txt", doc / "notes_copy.txt")
    _write_text(doc / "unique_doc.txt", "This file has no duplicate.\n" * 300)

    # ── Images: medium-size binary duplicates ─────────────────────────────────
    img = out / "images"
    for i in range(3):
        orig = img / f"photo_{i:02d}.jpg"
        _write_file(orig, 5 * 1024 * 1024, seed=i)       # 5 MB each
        _copy_file(orig, img / f"photo_{i:02d}_copy.jpg")

    # 4 unique images (no duplicates, different sizes to survive Stage 1)
    for i in range(4):
        _write_file(img / f"unique_{i}.jpg", (3 + i) * 1024 * 1024, seed=100 + i)

    # ── Same-size, different content (Stage 2 catches these) ─────────────────
    misc = out / "misc"
    _write_file(misc / "same_size_a.bin", 1024 * 512, seed=42)
    _write_file(misc / "same_size_b.bin", 1024 * 512, seed=43)   # same size, diff seed

    # ── Empty file edge case ──────────────────────────────────────────────────
    (misc / "empty.txt").touch()
    (misc / "empty_copy.txt").touch()

    # ── Symlink (should be ignored by scanner) ────────────────────────────────
    try:
        (misc / "symlink_to_photo.jpg").symlink_to(img / "photo_00.jpg")
    except OSError:
        pass  # Windows may require elevated privileges for symlinks

    # ── Nested directory duplicates ───────────────────────────────────────────
    deep = out / "nested" / "level1" / "level2" / "level3"
    _write_file(deep / "deep_orig.bin", 2 * 1024 * 1024, seed=99)
    _copy_file(deep / "deep_orig.bin", out / "nested" / "deep_copy.bin")

    total = sum(f.stat().st_size for f in out.rglob("*") if f.is_file())
    print(f"Done. Total size: {total / 1024 / 1024:.1f} MB")


def build_full(out: Path) -> None:
    """
    Generate ~17 GB of demo data for the actual demo day.

    Includes large file pairs (2 GB, 5 GB, 10 GB) to dramatically show
    Stage 3 timing vs Stage 1 instant grouping.
    """
    print(f"Generating full demo data in {out} …")
    print("This will take several minutes. Please wait …")
    if out.exists():
        shutil.rmtree(out)

    # First generate the small set as a subset
    build_small(out)

    # ── 2 GB duplicate pair ───────────────────────────────────────────────────
    large = out / "large_files"
    print("Writing 2 GB pair …")
    _write_file(large / "bigfile_2gb.bin", 2 * 1024 * 1024 * 1024, seed=1)
    _copy_file(large / "bigfile_2gb.bin", large / "bigfile_2gb_copy.bin")

    # ── 5 GB duplicate pair ───────────────────────────────────────────────────
    print("Writing 5 GB pair …")
    _write_file(large / "bigfile_5gb.bin", 5 * 1024 * 1024 * 1024, seed=2)
    _copy_file(large / "bigfile_5gb.bin", large / "bigfile_5gb_copy.bin")

    # ── Additional medium files to increase n ─────────────────────────────────
    extra = out / "extra"
    for i in range(50):
        _write_file(extra / f"medium_{i:03d}.dat", 100 * 1024 * 1024, seed=200 + i)

    print("Full demo data ready.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate DupeScan demo data.")
    parser.add_argument(
        "--size",
        choices=["small", "full"],
        required=True,
        help="'small' ≈ 100 MB (committed). 'full' ≈ 17 GB (gitignored).",
    )
    args = parser.parse_args()

    if args.size == "small":
        build_small(SMALL_DIR)
    else:
        build_full(FULL_DIR)


if __name__ == "__main__":
    main()
