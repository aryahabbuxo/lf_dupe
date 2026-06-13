"""
FastAPI application entry point.

Registers routers, configures CORS for the Vite dev server (localhost:5173),
and exposes OpenAPI docs at /docs for frontend type generation.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import scan, progress, results


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Lifespan context: nothing to initialise/teardown for this demo."""
    yield


app = FastAPI(
    title="DupeScan API",
    description="Multi-stage duplicate file detection pipeline.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the Vite dev server and any local origin during demo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(scan.router)
app.include_router(progress.router)
app.include_router(results.router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness probe used by the README quick-start verification step."""
    return {"status": "ok"}
