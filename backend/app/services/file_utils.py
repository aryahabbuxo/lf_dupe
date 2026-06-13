"""
Low-level filesystem helpers used by all three pipeline stages.

Centralising these here means the stages stay free of OS-level concerns
and are easier to unit-test with temp directories.
"""

from __future__ import annotations

import os
import sys
from typing import Generator


def get_file_size(path: str) -> int:
    """
    Return file size in bytes.

    Raises OSError on permission issues or missing files — callers decide
    whether to skip or abort the scan.
    """
    return os.path.getsize(path)


def safe_read_chunk(path: str, num_bytes: int) -> bytes:
    """
    Read the first *num_bytes* bytes from *path*.

    Returns an empty bytes object when the file is empty.
    Raises PermissionError or OSError; never swallows exceptions here
    because callers need to decide the recovery strategy.
    """
    with open(path, "rb") as fh:
        return fh.read(num_bytes)


def walk_files(root: str) -> Generator[str, None, None]:
    """
    Yield absolute paths for every regular file under *root*.

    follow_symlinks=False is non-negotiable: symlinks can create
    reference cycles that would make os.walk loop forever.
    """
    for dirpath, _dirs, filenames in os.walk(root, followlinks=False):
        for name in filenames:
            yield os.path.abspath(os.path.join(dirpath, name))


def log_skip(path: str, reason: str) -> None:
    """Write a structured skip message to stderr (visible in uvicorn logs)."""
    print(f"[SKIP] {path!r}: {reason}", file=sys.stderr)
