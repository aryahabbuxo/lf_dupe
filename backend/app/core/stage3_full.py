"""
Stage 3 — Full SHA-256 (O(m·F))

Where:
  m = candidate files surviving Stages 1 and 2
  F = mean file size

SHA-256 is a cryptographic hash with a collision probability of 1/2^128
per pair, which is astronomically small. This is the confirmation step —
if two files share the same SHA-256, we treat them as identical.

We stream the file in 64 KB chunks to avoid loading large files into RAM.
This stage is the bottleneck for very large files (gigabytes) but, because
m << n after Stage 1 and 2 filtering, the overall wall time is acceptable.
"""

from __future__ import annotations

import hashlib
import time
from collections import defaultdict

from app.services.file_utils import log_skip
from app.core.models import SkippedFile, DuplicateGroup

CHUNK = 65536  # 64 KB read buffer


def compute_full_hash(path: str) -> str:
    """
    Stream-hash *path* with SHA-256 and return 'sha256:<hex>'.

    Streaming avoids loading multi-gigabyte files into memory.
    Raises PermissionError or OSError on read failure.
    """
    digest = hashlib.sha256()
    with open(path, "rb") as fh:
        while True:
            block = fh.read(CHUNK)
            if not block:
                break
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def confirm_duplicates(
    partial_groups: dict[str, list[str]],
    size_map: dict[str, int],
    scan_state: dict,
) -> tuple[list[DuplicateGroup], list[SkippedFile]]:
    """
    Compute full SHA-256 for every survivor and produce confirmed DuplicateGroups.

    *size_map* maps file path → byte size (built in Stage 1) so we can
    annotate groups with size and compute wasted_bytes without a second stat.

    Returns:
        groups   — confirmed duplicate groups sorted by wasted_bytes descending
        skipped  — files that failed to hash
    """
    scan_state["stage"] = "full_hash"
    scan_state["stage3_start"] = time.monotonic()

    full_groups: dict[str, list[str]] = defaultdict(list)
    skipped: list[SkippedFile] = []
    processed = 0

    for paths in partial_groups.values():
        for path in paths:
            if scan_state.get("status") == "cancelled":
                scan_state["stage3_end"] = time.monotonic()
                return [], skipped

            try:
                full_hash = compute_full_hash(path)
            except PermissionError as exc:
                log_skip(path, str(exc))
                skipped.append(SkippedFile(path=path, reason="Permission denied"))
                continue
            except OSError as exc:
                log_skip(path, str(exc))
                skipped.append(SkippedFile(path=path, reason=str(exc)))
                continue

            full_groups[full_hash].append(path)
            processed += 1
            scan_state["files_scanned"] = scan_state.get("total_files", 0) + processed

    confirmed: list[DuplicateGroup] = []
    for full_hash, paths in full_groups.items():
        if len(paths) < 2:
            continue
        size = size_map.get(paths[0], 0)
        confirmed.append(
            DuplicateGroup(
                hash=full_hash,
                size=size,
                count=len(paths),
                files=sorted(paths),
                wasted_bytes=size * (len(paths) - 1),
            )
        )

    confirmed.sort(key=lambda g: g.wasted_bytes, reverse=True)
    scan_state["stage3_end"] = time.monotonic()
    return confirmed, skipped
