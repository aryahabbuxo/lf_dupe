"""
Scan orchestrator.

Holds a single module-level `scan_state` dict that acts as shared memory
between the background scanner thread and the SSE progress endpoint.
A threading.Lock guards mutations so reads from the HTTP thread are safe.

Design choice — synchronous, single-scan: the spec requires exactly one
active scan at a time, and the pipeline is I/O-bound (disk reads), not
CPU-bound, so a simple background thread is adequate without asyncio overhead.
"""

from __future__ import annotations

import json
import os
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

from app.core.models import ScanConfig, ScanResults, StageTiming, SkippedFile
from app.core.stage1_size import group_by_size
from app.core.stage2_partial import group_by_partial_hash
from app.core.stage3_full import confirm_duplicates

RESULTS_PATH = Path(__file__).parent.parent.parent / "data" / "results.json"

# Shared mutable state — written by scanner thread, read by SSE endpoint.
scan_state: dict = {
    "status": "idle",  # idle | running | completed | cancelled | error
    "stage": None,
    "files_scanned": 0,
    "total_files": 0,
    "percent": 0.0,
    "total_elapsed": 0.0,
    "stage1_start": None,
    "stage1_end": None,
    "stage2_start": None,
    "stage2_end": None,
    "stage3_start": None,
    "stage3_end": None,
    "error": None,
    "start_time": None,
}

_lock = threading.Lock()


def get_state_snapshot() -> dict:
    """Return a shallow copy of scan_state under lock for safe SSE reads."""
    with _lock:
        return dict(scan_state)


def _update_state(**kwargs: object) -> None:
    with _lock:
        scan_state.update(kwargs)


def _run_pipeline(config: ScanConfig) -> None:
    """
    Execute Stages 1–3 in sequence on a background thread.

    Any unhandled exception sets status='error' so the SSE stream can
    forward the message to the frontend toast system.
    """
    start = time.monotonic()
    _update_state(status="running", start_time=start, error=None, files_scanned=0, total_files=0)

    if not os.path.exists(config.path):
        _update_state(status="error", error=f"Path not found: {config.path}")
        return

    try:
        # ── Stage 1 ──────────────────────────────────────────────────────────
        size_groups, skipped1, total_files = group_by_size(config.path, scan_state)
        _update_state(total_files=total_files)

        if scan_state["status"] == "cancelled":
            return

        # Build a path→size lookup for Stage 3 (avoids second os.stat per file).
        size_map: dict[str, int] = {}
        for size, paths in size_groups.items():
            for p in paths:
                size_map[p] = size

        # ── Stage 2 (optional) ───────────────────────────────────────────────
        if config.use_partial_hash and size_groups:
            partial_groups, skipped2 = group_by_partial_hash(
                size_groups, config.chunk_size, scan_state
            )
        else:
            # Flatten size_groups → partial_groups using path as pseudo-key.
            partial_groups = {f"size:{s}": ps for s, ps in size_groups.items()}
            skipped2 = []
            _update_state(stage2_start=None, stage2_end=None)

        if scan_state["status"] == "cancelled":
            return

        # ── Stage 3 ──────────────────────────────────────────────────────────
        duplicate_groups, skipped3 = confirm_duplicates(partial_groups, size_map, scan_state)

        if scan_state["status"] == "cancelled":
            return

        elapsed = time.monotonic() - start
        all_skipped: list[SkippedFile] = skipped1 + skipped2 + skipped3

        # Compute stage durations from monotonic timestamps.
        s1 = _duration(scan_state.get("stage1_start"), scan_state.get("stage1_end"))
        s2 = _duration(scan_state.get("stage2_start"), scan_state.get("stage2_end"))
        s3 = _duration(scan_state.get("stage3_start"), scan_state.get("stage3_end"))

        results = ScanResults(
            scanned_at=datetime.now(timezone.utc).isoformat(),
            path=config.path,
            total_files=total_files,
            stage_times=StageTiming(size_grouping=s1, partial_hash=s2, full_hash=s3),
            total_elapsed=round(elapsed, 3),
            duplicate_groups=duplicate_groups,
            skipped_files=all_skipped,
            total_wasted_bytes=sum(g.wasted_bytes for g in duplicate_groups),
        )

        RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
        RESULTS_PATH.write_text(results.model_dump_json(indent=2), encoding="utf-8")

        _update_state(
            status="completed",
            stage="done",
            total_elapsed=round(elapsed, 3),
            percent=100.0,
        )

    except Exception as exc:  # noqa: BLE001
        _update_state(status="error", error=str(exc))


def _duration(start: float | None, end: float | None) -> float | None:
    if start is None or end is None:
        return None
    return round(end - start, 3)


def start_scan(config: ScanConfig) -> None:
    """Spawn a background thread that runs the three-stage pipeline."""
    _update_state(
        status="idle",
        stage=None,
        files_scanned=0,
        total_files=0,
        percent=0.0,
        total_elapsed=0.0,
        stage1_start=None,
        stage1_end=None,
        stage2_start=None,
        stage2_end=None,
        stage3_start=None,
        stage3_end=None,
        error=None,
    )
    thread = threading.Thread(target=_run_pipeline, args=(config,), daemon=True)
    thread.start()


def cancel_scan() -> None:
    """Signal the running pipeline to exit at the next cancellation checkpoint."""
    _update_state(status="cancelled")
