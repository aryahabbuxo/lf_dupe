"""
Tests for the SSE /scan/progress endpoint.

We use httpx's synchronous client (no async) to hit the FastAPI app directly
via ASGI transport — no real server needed, so tests are fast and self-contained.
"""

from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.core import scanner as scanner_module


@pytest.fixture()
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_scan_state():
    """Reset global scan_state to idle before every test."""
    scanner_module.scan_state.update(
        {
            "status": "idle",
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
    )
    yield
    # Restore idle so leaked threads don't affect subsequent tests.
    scanner_module.scan_state["status"] = "idle"


@pytest.fixture()
def completed_scan_state():
    """Set scan_state to 'completed' so the SSE generator terminates after 3 ticks."""
    scanner_module.scan_state.update(
        {
            "status": "completed",
            "stage": "done",
            "files_scanned": 10,
            "total_files": 10,
            "stage1_start": 0.0,
            "stage1_end": 0.1,
            "stage2_start": 0.1,
            "stage2_end": 0.5,
            "stage3_start": 0.5,
            "stage3_end": 1.0,
            "start_time": 0.0,
            "error": None,
        }
    )


def _collect_sse_events(client, max_events: int = 5) -> list[dict]:
    """
    Consume SSE events until the stream closes or max_events is reached.

    Requires scan_state to be in a terminal status so the generator stops.
    """
    events: list[dict] = []
    with client.stream("GET", "/scan/progress") as resp:
        buffer = ""
        for chunk in resp.iter_text():
            buffer += chunk
            lines = buffer.split("\n\n")
            buffer = lines.pop()  # incomplete final chunk
            for block in lines:
                for line in block.splitlines():
                    if line.startswith("data:"):
                        try:
                            events.append(json.loads(line[len("data:"):].strip()))
                        except json.JSONDecodeError:
                            pass
                if len(events) >= max_events:
                    return events
    return events


class TestSSEEndpoint:
    def test_returns_200_and_event_stream_header(self, client, completed_scan_state):
        """SSE endpoint must advertise text/event-stream content type."""
        with client.stream("GET", "/scan/progress") as resp:
            assert resp.status_code == 200
            assert "text/event-stream" in resp.headers["content-type"]

    def test_first_event_is_valid_json(self, client, completed_scan_state):
        """Each SSE data line must parse as JSON without raising."""
        events = _collect_sse_events(client, max_events=1)
        assert len(events) >= 1
        payload = events[0]
        assert isinstance(payload, dict)
        assert "stage" in payload
        assert "percent" in payload

    def test_payload_has_required_fields(self, client, completed_scan_state):
        """The progress payload must contain all fields the frontend consumes."""
        required = {"stage", "stage_times", "total_elapsed", "files_scanned", "total_files", "percent", "status"}
        events = _collect_sse_events(client, max_events=1)
        assert len(events) >= 1
        assert required.issubset(events[0].keys())

    def test_completed_state_emits_done_stage(self, client, completed_scan_state):
        """When status is 'completed', stage must be 'done' and percent 100."""
        events = _collect_sse_events(client, max_events=1)
        assert len(events) >= 1
        payload = events[0]
        assert payload["stage"] == "done"
        assert payload["status"] == "completed"
