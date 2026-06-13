"""
Pydantic models shared across the entire backend.

Keeping all data contracts in one place ensures the API, scanner, and tests
all reference the same shapes — a single source of truth for this project.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class ScanConfig(BaseModel):
    """Request body for POST /scan/start."""

    path: str = Field(..., description="Absolute or relative filesystem path to scan.")
    chunk_size: int = Field(
        default=65536,  # 64 KB — sweet spot for partial hash reads
        ge=4096,
        le=10_485_760,
        description="Bytes read per chunk in Stage 2 partial hash.",
    )
    use_partial_hash: bool = Field(
        default=True,
        description="If False, skip Stage 2 and go straight to full SHA-256.",
    )


class StageTiming(BaseModel):
    """Wall-clock times for each pipeline stage, in seconds."""

    size_grouping: Optional[float] = None
    partial_hash: Optional[float] = None
    full_hash: Optional[float] = None


class Progress(BaseModel):
    """Payload emitted by the SSE /scan/progress stream every 500 ms."""

    stage: str = Field(
        description="Current stage: 'size_grouping' | 'partial_hash' | 'full_hash' | 'done' | 'error'"
    )
    stage_times: StageTiming
    total_elapsed: float = Field(description="Seconds since scan started.")
    files_scanned: int = Field(description="Files processed so far.")
    total_files: int = Field(description="Total files discovered in Stage 1.")
    percent: float = Field(ge=0.0, le=100.0)
    error: Optional[str] = None


class SkippedFile(BaseModel):
    """A file that could not be read, included in final results for transparency."""

    path: str
    reason: str


class DuplicateGroup(BaseModel):
    """One set of identical files confirmed by full SHA-256 in Stage 3."""

    hash: str = Field(description="'sha256:<hex>' string.")
    size: int = Field(description="File size in bytes.")
    count: int = Field(description="Number of duplicate copies.")
    files: list[str] = Field(description="Absolute paths of all copies.")
    wasted_bytes: int = Field(
        description="Bytes wasted = size * (count - 1). One copy is the 'original'."
    )


class ScanResults(BaseModel):
    """Persisted to backend/data/results.json after each completed scan."""

    scanned_at: str = Field(description="ISO 8601 UTC timestamp.")
    path: str
    total_files: int
    stage_times: StageTiming
    total_elapsed: float
    duplicate_groups: list[DuplicateGroup]
    skipped_files: list[SkippedFile]
    total_wasted_bytes: int
