# DupeScan — User Guide

How to run the app, scan your own files, and interpret results.

---

## Prerequisites

| Tool | Minimum version | Check |
|---|---|---|
| Python | 3.10 | `python --version` |
| Node.js | 18 | `node --version` |
| npm | 9 | `npm --version` |

Both servers must run at the same time (use two terminal windows).

---

## 1. First-time setup

### Terminal 1 — Backend

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Terminal 2 — Frontend

```bash
cd frontend
npm install
```

You only need to do this once. After the first time, skip straight to **Starting the servers**.

---

## 2. Starting the servers

Every time you want to use the app, open two terminals.

**Terminal 1 — Backend (port 8000):**

```bash
cd backend
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Terminal 2 — Frontend (port 5173):**

```bash
cd frontend
npm run dev
```

You should see:
```
VITE v6.x  ready in 1s
➜  Local:   http://localhost:5173/
```

Open **http://localhost:5173** in your browser. The app is ready.

---

## 3. Quick test with demo data

The repo includes a script that generates files with known duplicates so you can see the pipeline working immediately.

**Generate the small dataset (~53 MB, takes ~5 seconds):**

```bash
cd backend
venv\Scripts\activate
python scripts/setup_demo.py --size=small
```

This creates `backend/demo_data_small/` with:
- 3 pairs of 5 MB photo duplicates
- 1 pair of 2 MB nested-directory duplicates  
- Text file duplicates (notes, reports)
- Two empty files (edge case)
- A symlink that should be ignored
- Files with the same size but different content (Stage 2 filter test)

**Run the scan:**

1. Open http://localhost:5173
2. In the **Directory path** field, enter the full path to `demo_data_small`:

   - Windows: `C:\Users\YourName\lf_dupe\backend\demo_data_small`
   - macOS/Linux: `/home/yourname/lf_dupe/backend/demo_data_small`

3. Leave **Partial hash (Stage 2)** toggled on
4. Click **Start Scan**

Expected results: **7 duplicate groups, ~17 MB wasted, under 200ms total.**

---

## 4. Scanning your own files

You can point the scanner at any directory on your machine — your Downloads folder, Documents, a photo archive, etc.

**Good directories to try:**

| Directory | What to expect |
|---|---|
| `Downloads` | Many duplicate PDFs, installers, archives |
| `Documents` | Backup copies of reports, duplicate presentations |
| `Pictures` | Camera imports duplicated across folders |
| A USB drive | Files copied multiple times |

**How to get the path:**

- **Windows:** Open the folder in Explorer → click the address bar → copy the path. Example: `C:\Users\kartik\Downloads`
- **macOS:** Right-click the folder in Finder → Get Info → copy the path shown under "Where"
- **Linux:** `pwd` in the terminal while inside the directory

**Paste it into the Directory path field and click Start Scan.**

### What happens if a folder has many files?

The progress bar shows which stage is running. For large collections:
- Stage 1 (size grouping) completes in seconds even for 100,000 files
- Stage 2 (partial hash) reads only 64 KB per candidate — still fast
- Stage 3 (full SHA-256) is the slow part, but only runs on the small set that survived Stages 1 and 2

You can click **Cancel** at any time and the scan stops at the next file boundary.

### Files the scanner skips

- **Symlinks** — always ignored (`follow_symlinks=False`)
- **Files you don't have read permission on** — logged as "skipped" in results, scan continues
- **The scanner never modifies, moves, or deletes any file.** It is read-only.

---

## 5. Reading the results

### Algorithm Complexity box

```
Size Grouping    O(n log n)    7ms
Partial Hash     O(k·P)       19ms
Full Hash        O(m·F)       69ms
─────────────────────────────────
Overall          O(n log n)   95ms
```

- The timings are real wall-clock measurements from your scan
- `k` and `m` are much smaller than `n` — that's the whole point of the pipeline
- If Stage 3 takes most of the time, it means many large files survived to that stage (expected for photo libraries)

### Duplicate group cards

Each card shows:
- **Hash** — truncated SHA-256 fingerprint (`sha256:abc1…ef99`)
- **Count** — how many copies exist
- **Size** — how large each copy is
- **Wasted** — bytes occupied by redundant copies (one copy is "the original")

Click a card to expand it and see the full path of every copy.

### Wasted bytes

`wasted = size × (count - 1)`

Example: 3 copies of a 5 MB file → 10 MB wasted. The first copy is kept; the other two are duplicates.

---

## 6. Demo day walkthrough

Suggested order for demonstrating to a professor:

1. **Open the Algorithm page** (`/algorithm` in the nav) — explain the three stages and the complexity proof before running anything
2. **Go to Home** and scan `demo_data_small` — the scan completes in under a second, so the progress bar flashes briefly; that's fine
3. **Expand a 5 MB group** — show `photo_00.jpg` and `photo_00_copy.jpg` confirming a real duplicate
4. **Point to the complexity box** — "Stage 1 took 7ms, eliminated 80% of files without reading a single byte"
5. **Scroll down to the How It Works section** — the stage cards now show real timings alongside the Big-O notation
6. **Toggle dark mode** (top-right sun/moon icon) — looks good on a projector

**For a more dramatic demo**, generate the large dataset first (takes ~10–15 minutes to write ~17 GB):

```bash
python scripts/setup_demo.py --size=full
```

Then scan `backend/demo_data/`. Stage 3 will take noticeably longer on the 2 GB and 5 GB file pairs, visually demonstrating that Stage 3 is the bottleneck — and why Stages 1 and 2 matter.

---

## 7. Running the test suite

The backend has 18 pytest tests covering every stage and the SSE endpoint.

```bash
cd backend
venv\Scripts\activate
pytest -v
```

Expected output:
```
tests/test_scanner.py::TestScannerPipeline::test_finds_duplicate_pair PASSED
tests/test_scanner.py::TestScannerPipeline::test_empty_directory_returns_no_groups PASSED
...
18 passed in 5s
```

---

## 8. Troubleshooting

**"No module named 'xxhash'"**  
The virtual environment isn't activated. Run `venv\Scripts\activate` (Windows) or `source venv/bin/activate` (macOS/Linux) before starting uvicorn.

**Frontend shows "No scan results yet" even after a scan**  
The Vite proxy routes `/scan` and `/results` to port 8000. If the backend isn't running, results never arrive. Make sure Terminal 1 shows `Application startup complete` before scanning.

**Port already in use**  
If port 5173 is taken, Vite picks the next available port (e.g., 5174). The URL is printed in the terminal — use that.

If port 8000 is taken:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
Then update `vite.config.ts` to proxy to `http://localhost:8001`.

**Scan completes instantly with 0 groups**  
The path has no duplicate files, or the path is wrong. Try the demo data path first to confirm the pipeline works, then try your own directory.

**Permission denied on some files**  
Normal — those files are listed in the "skipped files" section of the results JSON (`backend/data/results.json`). The scan continues past them.

**Windows path format**  
Use backslashes: `C:\Users\kartik\Downloads`. Forward slashes also work in the input field.
