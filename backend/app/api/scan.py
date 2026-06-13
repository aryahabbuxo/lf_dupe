"""
POST /scan/start  — kick off the pipeline
POST /scan/cancel — abort the active scan
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.core.models import ScanConfig
from app.core.scanner import scan_state, start_scan, cancel_scan

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/start")
def start(config: ScanConfig) -> dict[str, str]:
    """
    Start a new scan.

    Rejects the request if a scan is already running — only one active
    scan is permitted at a time (single-threaded pipeline assumption).
    """
    if scan_state.get("status") == "running":
        raise HTTPException(status_code=409, detail="A scan is already running.")
    start_scan(config)
    return {"status": "started"}


@router.post("/cancel")
def cancel() -> dict[str, str]:
    """
    Signal the active scan to stop at its next cancellation checkpoint.

    The scanner checks the flag between file operations, so cancellation
    is cooperative (may take up to one file-read latency to take effect).
    """
    if scan_state.get("status") != "running":
        raise HTTPException(status_code=409, detail="No scan is currently running.")
    cancel_scan()
    return {"status": "cancelled"}
