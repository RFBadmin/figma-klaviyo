# Figma → Klaviyo Plugin

A Figma plugin that lets designers export email designs directly into Klaviyo as production-ready templates. It slices email frames into horizontal image bands, compresses them, and pushes them to Klaviyo — all from inside Figma.

---

## What It Does

### Designer Mode
1. Lists every email frame (500–700 px wide) on the current Figma page
2. Designer selects which frames to process (all checked by default)
3. Clicks **"✦ Slice Frame"** — the plugin:
   - Exports the full frame as a PNG at 2× scale
   - Reads every layer's exact bounding box from the Figma API
   - Sends both to the backend, where Claude Vision groups the layers into logical sections
4. A visual preview shows the slices overlaid on the design
5. Designer can:
   - **Drag** the blue boundary handles to reposition cuts
   - **Click "+"** on any slice to split it in half
   - **Double-click** a label to rename a slice
   - **Click "✕"** to delete a slice (merges into adjacent slice)
   - **Re-analyze** to re-run AI slicing
6. Clicks **"Compress →"** — backend compresses each slice with Pillow (JPEG or PNG based on image content)
7. Compression results show per-slice size, status (optimal / good / warning / failed) and total
8. Clicks **"Save →"** — slice data is saved into Figma node metadata

### Tech Mode
1. Loads the saved slice data from whichever frame is active
2. Tech team edits per-slice **alt text** and **link URLs** in a table
3. Chooses push destination: **Template only** or **Template + Campaign**
4. Clicks **"Push to Klaviyo →"**:
   - Each slice image is uploaded to Klaviyo's CDN
   - A responsive HTML email is built (table-based, 600 px wide)
   - A Klaviyo email template is created
   - Optionally a scheduled campaign is created
5. Returns direct links to the created template / campaign in Klaviyo

---

## Architecture

```
plugin/                      ← Figma plugin (TypeScript + Preact)
│
├── src/
│   ├── code.ts              ← Figma sandbox (plugin backend)
│   ├── ui.tsx               ← Plugin UI root
│   ├── ui.html              ← HTML shell + all CSS
│   ├── types/index.ts       ← Shared types (Slice, SliceData, messages)
│   ├── utils/
│   │   ├── figma-api.ts     ← Figma node helpers (getAllEmailFrames, etc.)
│   │   ├── export.ts        ← uint8ArrayToBase64 helper
│   │   └── metadata.ts      ← saveSliceData / loadSliceData (Figma storage)
│   └── components/
│       ├── DesignerMode.tsx  ← Full designer workflow
│       ├── SlicePreview.tsx  ← Visual slice editor (drag, split, delete, rename)
│       ├── TechMode.tsx      ← Klaviyo push workflow
│       └── KlaviyoConfig.tsx ← Template / campaign configuration form
│
└── dist/                    ← Compiled output (committed, loaded by Figma)
    ├── code.js
    └── ui.html

backend/                     ← Flask API (Python)
│
├── app.py                   ← Flask app, CORS, blueprint registration
├── routes/
│   ├── analyze.py           ← POST /api/analyze   (AI slicing)
│   ├── compress.py          ← POST /api/compress  (image compression)
│   └── klaviyo.py           ← GET  /api/klaviyo/lists
│                               POST /api/klaviyo/preview
│                               POST /api/klaviyo/push
├── services/
│   ├── claude_vision.py     ← Claude Vision — groups layer bands into slices
│   ├── squoosh.py           ← Pillow-based image compression (JPEG/PNG)
│   ├── klaviyo_client.py    ← Klaviyo REST API client
│   └── template_builder.py  ← Builds Klaviyo-compatible HTML email
└── utils/
    └── storage.py           ← TempStorage — serves compressed images via /temp/<file>

Dockerfile                   ← python:3.12-slim, no Node.js needed
railway.toml                 ← Railway deploy config (Dockerfile builder)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Plugin UI | Preact (JSX), TypeScript, esbuild |
| Plugin sandbox | Figma Plugin API (TypeScript) |
| Backend | Python 3.12, Flask, Gunicorn |
| AI slicing | Anthropic Claude Haiku (claude-haiku-4-5) via `anthropic` SDK |
| Image compression | Pillow (JPEG progressive + PNG optimize) |
| Klaviyo integration | Klaviyo REST API |
| Hosting | Railway (Docker, `python:3.12-slim`) |

---

## How Slicing Works

### Step 1 — Layer bands (`code.ts`)
`computeSliceBands()` walks the frame's direct children, reads each node's `absoluteBoundingBox`, and returns merged vertical bands:

- Overlapping or nearly-adjacent bands (≤8 px gap) are merged
- Gaps between bands are absorbed into adjacent bands at their midpoints
- First band always starts at `y=0`, last band always ends at `frameHeight`
- If the whole frame collapses to one band (e.g. a single wrapping group), recurses one level deeper

### Step 2 — AI grouping (`GROUP_PROMPT` in `claude_vision.py`)
The backend receives the layer bands + the full-frame image. Claude sees:
- The exact pixel positions of every band
- The actual design image

It groups consecutive bands into logical email sections (e.g. `header`, `hero_banner`, `cta`, `footer`) and returns `{ groups: [{ name, band_indices[], alt_text }] }`.

The pixel positions of the first and last band in each group become the slice boundaries — exact, no pixel guessing.

### Step 3 — Fallback (`SLICE_PROMPT`)
If no layer bands are available, Claude estimates boundaries from pixels alone. Less accurate, used as fallback only.

---

## API Endpoints

### `POST /api/analyze`
Analyze a frame and return slice boundaries.

**Request:**
```json
{
  "image_base64": "<PNG base64>",
  "frame_width": 600,
  "frame_height": 2844,
  "layer_bands": [
    { "name": "Header", "y_start": 0, "y_end": 120 },
    { "name": "Hero", "y_start": 120, "y_end": 680 }
  ]
}
```

**Response:**
```json
{
  "slices": [
    { "name": "header", "y_start": 0, "y_end": 120, "alt_text": "Header section" },
    { "name": "hero_banner", "y_start": 120, "y_end": 680, "alt_text": "Hero image" }
  ],
  "analysis": "Grouped 6 bands into 4 logical sections"
}
```

---

### `POST /api/compress`
Compress a batch of slice images with Pillow.

**Request:**
```json
{
  "slices": [
    { "id": "slice_1", "name": "hero", "image_base64": "<PNG base64>" }
  ],
  "settings": { "target_size_kb": 100, "max_size_kb": 200 }
}
```

**Response:**
```json
{
  "compressed": [
    {
      "id": "slice_1",
      "name": "hero",
      "original_size": 245000,
      "compressed_size": 87000,
      "reduction_percent": 64,
      "width": 1200,
      "height": 1120,
      "format": "jpeg",
      "status": "optimal",
      "warnings": [],
      "temp_url": "https://figma-klaviyo-production.up.railway.app/temp/slice_1_1710000000.jpg",
      "passed_validation": true
    }
  ],
  "summary": { "total_original": 245000, "total_compressed": 87000, "total_reduction_percent": 64, "slice_count": 1, "passed_count": 1, "warning_count": 0, "failed_count": 0 },
  "validation": { "status": "passed", "total_size_kb": 87, "target_kb": 500 },
  "recommendations": []
}
```

**Compression logic:**
- Detect format: `< 5 000 unique colours → PNG (lossless)`, otherwise `JPEG`
- JPEG: start at quality 82, reduce by 10 per attempt (minimum 50) until ≤ 100 KB
- PNG: if still > 200 KB after optimize, auto-switch to JPEG
- Original dimensions are always preserved (no resizing)

---

### `GET /api/klaviyo/lists`
Returns all Klaviyo lists. Requires `X-Klaviyo-Key: pk_...` header.

### `POST /api/klaviyo/preview`
Returns the generated HTML for preview. No API key needed.

### `POST /api/klaviyo/push`
Full push: upload images → build HTML → create template → (optionally) create campaign.
Requires `X-Klaviyo-Key: pk_...` header.

---

## Plugin Message Protocol

Messages pass between the Figma sandbox (`code.ts`) and the UI as `pluginMessage` objects via `parent.postMessage`.

### Plugin → UI

| Type | Payload | Triggered by |
|---|---|---|
| `ALL_FRAMES_LOADED` | `data[]` (all page frames) | On open, page change, canvas deselect |
| `FRAMES_SELECTED` | `data[]` (selected frames only) | Canvas selection changes |
| `FRAME_EXPORTED` | `data: string` (base64 PNG) | `EXPORT_FRAME` |
| `FRAME_LAYOUT` | `bands[], frameHeight` | `GET_FRAME_LAYOUT` |
| `SLICE_DATA_SAVED` | — | `SAVE_SLICE_DATA` |
| `SLICE_DATA_LOADED` | `data: SliceData` | `LOAD_SLICE_DATA` |
| `KLAVIYO_KEY_LOADED` | `key: string \| null` | `GET_KLAVIYO_KEY` |
| `KLAVIYO_KEY_SAVED` | — | `SAVE_KLAVIYO_KEY` |
| `USER_INFO` | `name: string` | `GET_USER_INFO` |
| `ERROR` | `message: string` | Any sandbox error |

### UI → Plugin

| Type | Payload | Purpose |
|---|---|---|
| `GET_ALL_FRAMES` | — | Fetch all email frames on page |
| `EXPORT_FRAME` | `frameId` | Export frame PNG at 2× scale |
| `GET_FRAME_LAYOUT` | `frameId` | Compute layer bands |
| `SAVE_SLICE_DATA` | `frameId, data` | Save slices to node metadata |
| `LOAD_SLICE_DATA` | `frameId` | Load slices from node metadata |
| `GET_KLAVIYO_KEY` | — | Load saved API key from Figma storage |
| `SAVE_KLAVIYO_KEY` | `key` | Save API key to Figma storage |
| `GET_USER_INFO` | — | Get current Figma username |
| `CLOSE_PLUGIN` | — | Close the plugin |

---

## Data Model

### `Slice`
```typescript
interface Slice {
  id: string;               // "slice_1710000000_0"
  name: string;             // "hero_banner"
  y_start: number;          // pixels from top of frame
  y_end: number;
  alt_text: string;         // used in <img alt="...">
  compressed_url?: string;  // temp URL after compression step
  klaviyo_url?: string;     // CDN URL after push to Klaviyo
  link?: string;            // href for the slice's <a> wrapper
}
```

### `SliceData` (persisted in Figma node metadata)
```typescript
interface SliceData {
  version: '1.0.0';
  created_by: 'designer';
  created_at: string;      // ISO 8601
  frame_id: string;
  frame_name: string;
  slices: Slice[];
  status: 'draft' | 'ready' | 'pushed';
}
```

---

## Authentication

Each team member enters their own **Klaviyo Private API key** (`pk_...`) once in Tech Mode.

- Saved to `figma.clientStorage` — local to their Figma account on their machine
- Never stored on the backend or in any database
- Sent on every request to `/api/klaviyo/*` as the `X-Klaviyo-Key` header
- Validated on the backend: must start with `pk_`

---

## Frame Selection Behaviour

| Figma canvas state | Plugin shows |
|---|---|
| Nothing selected | All email frames on the page (full checklist) |
| One or more email frames selected | Only those frames |
| Selection changed to non-email frame | Full page list restored |
| Page switched | Full list of frames on new page |

---

## Local Development

### Plugin
```bash
cd plugin
npm install
npm run build      # one-time build → dist/
npm run dev        # watch mode (rebuilds on save)
```

Load in Figma: **Plugins → Development → Import plugin from manifest** → select `plugin/manifest.json`

The compiled `dist/` folder is committed to the repo so the plugin works without a build step.

### Backend
```bash
cd backend
python -m venv .venv
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

pip install -r requirements.txt
```

Create `backend/.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
BASE_URL=http://localhost:8080
FLASK_DEBUG=1
```

```bash
python app.py
# Server starts at http://localhost:8080
```

---

## Deployment (Railway)

The repo uses a `Dockerfile` + `railway.toml` at the root. Railway auto-deploys on every push to `main`.

**`railway.toml`:**
```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "gunicorn --bind 0.0.0.0:8080 --workers 2 --timeout 120 app:app"
```

**`Dockerfile`:**
```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
ENV PYTHONUNBUFFERED=1
EXPOSE 8080
CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120", "app:app"]
```

**Environment variables to set in Railway:**
```
ANTHROPIC_API_KEY=sk-ant-...
BASE_URL=https://figma-klaviyo-production.up.railway.app
```

**Live URL:** `https://figma-klaviyo-production.up.railway.app`

---

## Frame Requirements

Figma frames must be **500–700 px wide** to be listed. Standard email width is 600 px.

---

## Compression Targets (Klaviyo Best Practices)

| Per-slice size | Status |
|---|---|
| ≤ 100 KB | Optimal |
| 101–150 KB | Good |
| 151–200 KB | Warning |
| > 200 KB | Failed — split the slice |
| **Total ≤ 500 KB** | Email passes overall validation |

---

## Known Issues Fixed

| Bug | Root cause | Fix applied |
|---|---|---|
| AI cutting through text | Claude Vision only sees pixels, estimates boundaries badly | Hybrid: Figma layer boxes give exact positions, AI only groups them |
| Spacer slices created between sections | `computeSliceBands` inserted spacer objects for gaps | Gaps absorbed into adjacent bands at midpoints |
| "Analyze" button not showing | `code.ts` sent `FRAMES_SELECTED` but UI only handled `FRAME_SELECTED` | Added `FRAMES_SELECTED` case to `ui.tsx` |
| Canvas selection wiped full list | `selectionchange` always replaced the full list with selected frames only | When nothing is selected, `selectionchange` now restores the full page list |
| Duplicate slice buttons | `FrameWorkflow` rendered an extra "Slice This Frame" button alongside the checklist button | `FrameWorkflow` hidden when `step === 'select'` |
| "+ Add Slice" added to bottom only | `handleAddSlice` always split the last slice | Replaced with per-slice "+" button on right side of each slice row |
| `@squoosh/lib` crash (Node 18/22) | `@squoosh/lib` tries to set `globalThis.navigator` (read-only in Node 21+) and uses `fetch()` for WASM loading (broken on Node 18) | Removed `@squoosh/lib` entirely; replaced with pure Pillow compression in Python |
| `exportSlices` "not a function" error | Function tried to clone Figma nodes which failed for some node types | Replaced with HTML Canvas `drawImage` crop in the UI |
