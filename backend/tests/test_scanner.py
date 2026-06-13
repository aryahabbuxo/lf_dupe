"""
Integration tests for the full scanner pipeline.

These tests run the actual pipeline end-to-end on small temp dirs,
validating that Stage 1 → 2 → 3 composition produces correct results.
"""

from __future__ import annotations

import json
import time

import pytest

from app.core.models import ScanConfig
from app.core.scanner import start_scan, scan_state, RESULTS_PATH


def _make_file(path, content: bytes):
    path.write_bytes(content)
    return str(path)


def _wait_for_completion(timeout: float = 10.0):
    """Poll scan_state until non-running status or timeout."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if scan_state.get("status") not in ("running", "idle"):
            return
        time.sleep(0.1)
    raise TimeoutError("Scan did not complete within timeout.")


class TestScannerPipeline:
    def test_finds_duplicate_pair(self, tmp_path):
        """Two identical files must appear in duplicate_groups."""
        content = b"duplicate content\n" * 100
        _make_file(tmp_path / "a.bin", content)
        _make_file(tmp_path / "b.bin", content)

        config = ScanConfig(path=str(tmp_path))
        start_scan(config)
        _wait_for_completion()

        assert scan_state["status"] == "completed"
        assert RESULTS_PATH.exists()
        data = json.loads(RESULTS_PATH.read_text())
        assert len(data["duplicate_groups"]) == 1
        assert data["duplicate_groups"][0]["count"] == 2

    def test_empty_directory_returns_no_groups(self, tmp_path):
        """An empty directory is valid input — should produce zero duplicate_groups."""
        config = ScanConfig(path=str(tmp_path))
        start_scan(config)
        _wait_for_completion()

        assert scan_state["status"] == "completed"
        data = json.loads(RESULTS_PATH.read_text())
        assert data["duplicate_groups"] == []
        assert data["total_wasted_bytes"] == 0

    def test_nonexistent_path_sets_error(self, tmp_path):
        """A missing root path must set status='error', not crash the thread."""
        config = ScanConfig(path=str(tmp_path / "does_not_exist"))
        start_scan(config)
        _wait_for_completion()

        assert scan_state["status"] == "error"
        assert "Path not found" in scan_state["error"]

    def test_unique_files_produce_no_duplicates(self, tmp_path):
        """Three files with different sizes and content = no duplicates."""
        _make_file(tmp_path / "x.txt", b"x" * 100)
        _make_file(tmp_path / "y.txt", b"y" * 200)
        _make_file(tmp_path / "z.txt", b"z" * 300)

        config = ScanConfig(path=str(tmp_path))
        start_scan(config)
        _wait_for_completion()

        data = json.loads(RESULTS_PATH.read_text())
        assert data["duplicate_groups"] == []
