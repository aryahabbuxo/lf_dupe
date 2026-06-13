"""
GET  /results — load the latest scan results from disk
DELETE /results — remove results.json
"""

from __future__ import annotations

import json

from fastapi import APIRouter, HTTPException

from app.core.scanner import RESULTS_PATH

router = APIRouter(prefix="/results", tags=["results"])


@router.get("")
def get_results() -> dict:
    """
    Return the persisted results.json.

    Returns a descriptive message rather than 404 when no scan has been run,
    so the frontend can distinguish "no data" from a real server error.
    """
    if not RESULTS_PATH.exists():
        return {"message": "No scan results available"}
    try:
        return json.loads(RESULTS_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        raise HTTPException(status_code=500, detail=f"Failed to read results: {exc}") from exc


@router.delete("")
def delete_results() -> dict[str, str]:
    """Remove results.json so the UI starts fresh."""
    if not RESULTS_PATH.exists():
        raise HTTPException(status_code=404, detail="No results file to delete.")
    try:
        RESULTS_PATH.unlink()
    except OSError as exc:
        raise HTTPException(status_code=500, detail=f"Failed to delete results: {exc}") from exc
    return {"status": "deleted"}
