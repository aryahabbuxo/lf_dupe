"""
Stage 2 — Partial Hash (O(k·P))

Where:
  k = number of candidate files entering this stage (after Stage 1)
  P = chunk_size in bytes (default 64 KB)

We read only the first P bytes of each file and compute an xxHash-64
digest. xxHash is a non-cryptographic hash chosen for throughput
(~13 GB/s vs SHA-256's ~500 MB/s on modern CPUs). It is acceptable here
because partial hashes are a filter, not a security guarantee — Stage 3
uses SHA-256 for confirmation.

Why first 64 KB? Photos and documents typically differ in their headers
(EXIF, PDF header, DOCX structure). Random byte files differ uniformly.
The partial read catches most mismatches without reading the whole file.
"""

from __future__ import annotations

import time
from collections import defaultdict

import xxhash

from app.services.file_utils import safe_read_chunk, log_skip
from app.core.models import SkippedFile


PARTIAL_HASH_STAGE = "partial_hash"


def compute_partial_hash(path: str, chunk_size: int) -> str:
    """
    Return an xxHash-64 hex digest of the first *chunk_size* bytes of *path*.

    Raises PermissionError or OSError on read failure; callers handle skip logic.
    """
    data = safe_read_chunk(path, chunk_size)
    return xxhash.xxh64(data).hexdigest()


def group_by_partial_hash(
    size_groups: dict[int, list[str]],
    chunk_size: int,
    scan_state: dict,
) -> tuple[dict[str, list[str]], list[SkippedFile]]:
    """
    For each size group, compute partial hashes and re-bucket by hash.

    Files with a unique partial hash within their size group cannot be
    duplicates — they are dropped. Only groups of 2+ survive to Stage 3.

    Returns:
        hash_groups  — {partial_hash_hex: [path, ...]} multi-member only
        skipped      — files that could not be read
    """
    scan_state["stage"] = PARTIAL_HASH_STAGE
    scan_state["stage2_start"] = time.monotonic()

    hash_groups: dict[str, list[str]] = defaultdict(list)
    skipped: list[SkippedFile] = []
    processed = 0

    for _size, paths in size_groups.items():
        for path in paths:
            if scan_state.get("status") == "cancelled":
                scan_state["stage2_end"] = time.monotonic()
                return dict(hash_groups), skipped

            try:
                digest = compute_partial_hash(path, chunk_size)
            except PermissionError as exc:
                log_skip(path, str(exc))
                skipped.append(SkippedFile(path=path, reason="Permission denied"))
                continue
            except OSError as exc:
                log_skip(path, str(exc))
                skipped.append(SkippedFile(path=path, reason=str(exc)))
                continue

            hash_groups[digest].append(path)
            processed += 1
            scan_state["files_scanned"] = scan_state.get("total_files", 0) + processed

    survivors = {h: ps for h, ps in hash_groups.items() if len(ps) > 1}
    scan_state["stage2_end"] = time.monotonic()
    return survivors, skipped
