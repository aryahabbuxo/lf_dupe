# Large File Duplicate Detection

**Course:** Design and Analysis of Algorithms · RV College of Engineering

## Architecture

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11+), synchronous pipeline, background thread |
| Frontend | React 18 + Vite + Tailwind CSS + shadcn/ui components |
| Algorithm | Size Grouping → Partial xxHash (64 KB) → Full SHA-256 |
| Storage | In-memory + `data/results.json` (no database) |

## Algorithm Stages

| Stage | Complexity | Description |
|---|---|---|
| 1 — Size Grouping | O(n log n) | Group n files by byte size; singletons dropped instantly |
| 2 — Partial Hash | O(k·P) | xxHash first 64 KB; k << n after Stage 1 |
| 3 — Full SHA-256 | O(m·F) | Stream-hash m survivors; m << k |

**Reduction:** naive O(n²·F) → O(n log n + k·P + m·F) ≈ O(n log n) in practice.

## Quick Start

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
python scripts/setup_demo.py --size=small   # ~100 MB demo data
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Verify: `curl http://localhost:8000/health` → `{"status":"ok"}`

### 2. Frontend

```bash
cd frontend
npm install
npm run generate-types    # Requires backend running on :8000
npm run dev               # http://localhost:5173
```

### 3. Demo

1. Open `http://localhost:5173`
2. Enter path to demo data: `./demo_data_small` (or absolute path)
3. Click **Start Scan**
4. Watch the three-stage pipeline progress in real time
5. Navigate to **Algorithm** page for the complexity walkthrough

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/scan/start` | `{path, chunk_size?, use_partial_hash?}` → starts scan |
| `GET` | `/scan/progress` | SSE stream · JSON every 500 ms |
| `POST` | `/scan/cancel` | Abort active scan cooperatively |
| `GET` | `/results` | Latest `results.json` |
| `DELETE` | `/results` | Clear results |
| `GET` | `/health` | Liveness probe |

## Testing

```bash
cd backend
pytest -v
```

Tests cover: Stage 1 grouping, Stage 2 partial hash, Stage 3 full hash, full pipeline integration, SSE endpoint format.

## Project Structure

```
dupescan/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, lifespan
│   │   ├── api/                 # Route handlers (thin layer only)
│   │   ├── core/                # Algorithm stages + orchestrator
│   │   └── services/            # Filesystem utilities
│   ├── scripts/setup_demo.py    # Demo data generator
│   ├── tests/                   # pytest suite
│   └── demo_data_small/         # Committed 100 MB test set
└── frontend/
    └── src/
        ├── components/          # UI components (shadcn/ui based)
        ├── pages/               # Route pages
        ├── hooks/               # useScan, useResults
        ├── context/             # ThemeContext, ScanContext
        └── lib/                 # api.ts, utils.ts
```
