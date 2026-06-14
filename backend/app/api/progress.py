"""
GET /scan/progress — Server-Sent Events stream.

SSE is the right transport here because:
  - Unidirectional (server → client) — no need for WebSocket bidirectionality.
  - Auto-reconnect is built into the browser EventSource API.
  - Works over plain HTTP with no special handshake.

The generator yields a JSON event every 500 ms. The SSE format requires
lines of the form `data: <payload>\n\n`.
"""

from __future__ import annotations

import json
import time

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.core.scanner import get_state_snapshot
from app.core.models import StageTiming

router = APIRouter(prefix="/scan", tags=["progress"])

SSE_INTERVAL = 0.5  # seconds between emissions


def _build_payload(state: dict) -> str:
    """Convert the current scan_state snapshot into a JSON SSE payload."""
    start: float | None = state.get("start_time")
    elapsed = round(time.monotonic() - start, 3) if start else 0.0

    # Use stage-specific counters so progress never overflows 100%.
    stage = state.get("stage") or "idle"
    if stage == "partial_hash":
        total = max(state.get("stage2_total", 0), 1)
        scanned = state.get("stage2_scanned", 0)
    elif stage == "full_hash":
        total = max(state.get("stage3_total", 0), 1)
        scanned = state.get("stage3_scanned", 0)
    else:
        total = max(state.get("total_files", 0), 1)
        scanned = state.get("files_scanned", 0)
    percent = min(round(scanned / total * 100, 1), 100.0)

    def _dur(key_start: str, key_end: str) -> float | None:
        s = state.get(key_start)
        e = state.get(key_end)
        if s is None:
            return None
        end_val = e if e is not None else time.monotonic()
        return round(end_val - s, 3)

    timing = StageTiming(
        size_grouping=_dur("stage1_start", "stage1_end"),
        partial_hash=_dur("stage2_start", "stage2_end"),
        full_hash=_dur("stage3_start", "stage3_end"),
    )

    payload = {
        "stage": state.get("stage") or "idle",
        "stage_times": timing.model_dump(),
        "total_elapsed": elapsed,
        "files_scanned": scanned,
        "total_files": total,
        "stage1_total": state.get("total_files", 0),
        "stage2_total": state.get("stage2_total"),
        "stage3_total": state.get("stage3_total"),
        "percent": percent,
        "status": state.get("status", "idle"),
        "error": state.get("error"),
    }
    return json.dumps(payload)


def _sse_generator():
    """
    Yield SSE-formatted events until the scan completes, errors, or is cancelled.

    Keeps streaming for a few ticks after terminal states so the frontend
    receives the final payload before the connection closes.
    """
    terminal_ticks = 0
    while True:
        state = get_state_snapshot()
        payload = _build_payload(state)
        yield f"data: {payload}\n\n"

        status = state.get("status")
        if status in ("completed", "error", "cancelled"):
            terminal_ticks += 1
            if terminal_ticks >= 3:
                break

        time.sleep(SSE_INTERVAL)


@router.get("/progress")
def progress() -> StreamingResponse:
    """
    Stream real-time scan progress as Server-Sent Events.

    The browser EventSource automatically reconnects if the connection drops,
    so we don't need explicit reconnection logic on the server side.
    """
    return StreamingResponse(
        _sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering in prod
        },
    )
