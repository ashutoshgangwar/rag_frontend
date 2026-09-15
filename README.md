# RAG Frontend

A single-page React app for a local Retrieval-Augmented Generation backend.
Upload PDFs, ask questions about them, and see the exact chunks each answer was
built from.

The point of this UI is to make retrieval **visible**. Every answer carries the
verbatim text the model was given, cited back to a filename and a page number,
with a link to the original PDF so any claim can be checked at the source.

Nothing here talks to a paid cloud AI service. The backend runs a local Ollama
instance for both the LLM and the embeddings, and stores everything in MongoDB
Atlas.

---

## The three panels

### 1. Chat
The main area. Questions and answers, newest at the bottom.

- Enter sends, Shift+Enter makes a newline.
- A live character counter warns past 1000 characters and blocks sending.
- While a question is in flight: a thinking indicator, a disabled input, and a
  **Cancel** button that genuinely aborts the request.
- Each answer shows how long it took and how many sources it used.
- A **topK slider (1–20)** sets how many chunks are retrieved, so you can watch
  retrieval quality change.
- A **scope picker** above the input chooses which PDFs the question searches.
  It defaults to all; select a subset and the input area says
  "Asking 1 of 3 documents" so a missing answer explains itself.
- Under each answer, a collapsible **Sources** section: one card per chunk,
  headed by `filename · page N`, with a similarity band, the exact chunk text
  (truncated to 200 characters with a "show more" toggle), and the filename
  linked to the original PDF.

**About the similarity score.** It is a normalised cosine score in `[0, 1]`, and
in practice the scale does not start at zero — a genuinely relevant chunk scores
roughly 0.75–0.90 and even a weak match sits near 0.6. Rendering that as a raw
0–100% bar would make every result look mediocre, so scores are shown as labelled
bands (**strong** ≥ 0.75, **moderate** ≥ 0.6, **weak** below), with the bar scaled
across the useful range rather than from zero.

### 2. Upload
Drag-and-drop with a click-to-browse fallback.

- Validates client-side first — `.pdf` extension, over 0 bytes, at most 20 MB —
  so obvious mistakes are reported instantly instead of after a round trip.
- Shows a real byte-level progress bar during the upload, then switches to an
  indeterminate **"Indexing… embedding chunks"** state. Progress reaching 100%
  only means the bytes arrived; the server then extracts, chunks and embeds,
  which is by far the slower half.
- On success: filename, pages, characters and chunks stored.
- Re-uploading identical bytes is **not an error**. The backend hashes the file
  and returns the existing document, and the UI says "Already indexed — showing
  the existing document" rather than implying new work happened.

### 3. Knowledge base
Everything indexed, headed by `3 documents · 47 chunks indexed`.

- One row per PDF: filename, page count, chunk count, formatted size, a relative
  timestamp, and a status pill (`pending` / `processing` / `ready` / `failed`).
- A **failed** row shows the reason on the row and offers a re-upload, rather
  than hiding a broken document in the list.
- Per row: **View chunks** (expands, loading previews on demand), **Download**
  (opens the original PDF), and **Delete** behind a confirmation naming the file.
- **Clear knowledge base** wipes everything, behind a stronger confirmation that
  requires typing `DELETE`.

### Health indicator
A badge in the header, polled every 30 seconds. Green when healthy, amber when
degraded, red when the backend cannot be reached. Click it to see which of
MongoDB / Ollama is down, the database name, the vector index, and the model
names. When the backend is unreachable entirely, a banner says so and names the
URL — a stopped server should not make the app look broken.

---

## Prerequisites

1. **Node.js 18+** (Vite requires it). Check with `node -v`.
2. **The RAG backend must already be running**, along with its MongoDB Atlas
   connection and a local Ollama with `llama3.2` and `nomic-embed-text` pulled.

Confirm the backend is up before starting the frontend:

```bash
curl http://localhost:5050/api/health
```

You want `"success": true` with both services `reachable`.

> **macOS note.** Do not run the backend on port 5000. The AirPlay Receiver
> listens there and answers every request with an empty `403`, so requests never
> reach Express. Either turn it off in *System Settings → General → AirDrop &
> Handoff*, or run the backend on another port. This project's backend uses
> **5050**.

---

## Installation

```bash
npm install
cp .env.example .env     # then edit if your backend is on a different port
npm run dev
```

Vite prints the local URL (typically <http://localhost:5173>).

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve that build
npm run lint      # eslint
```

---

## Configuration

Vite only exposes variables prefixed with `VITE_`.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5000` | Base URL of the backend, no trailing slash |

It is read once in [`src/api/client.js`](src/api/client.js) as
`import.meta.env.VITE_API_BASE_URL`, and never hardcoded in a component. To point
at a different port, edit `.env` and **restart the dev server** — Vite reads env
files at startup, so a running server will not pick up the change.

---

## The API contract it consumes

Base URL `VITE_API_BASE_URL`. No auth, no API keys. Every error, at any status
code, is `{ "success": false, "error": "Human readable message" }`, which is why
error handling lives in exactly one helper.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | MongoDB + Ollama reachability. 200 healthy, 503 degraded, same body shape |
| `POST` | `/api/documents/upload` | Ingest one PDF (`multipart/form-data`, field `file`, 20 MB max) |
| `GET` | `/api/documents?limit=&offset=` | List uploaded PDFs, newest first, plus whole-base `stats` |
| `GET` | `/api/documents/:id` | One PDF's metadata and ingestion status |
| `GET` | `/api/documents/:id/chunks?limit=&offset=` | That PDF's chunks, 200-character previews |
| `GET` | `/api/documents/:id/download` | The original PDF bytes (`application/pdf`) |
| `DELETE` | `/api/documents/:id` | Delete one PDF, its bytes and its chunks |
| `DELETE` | `/api/documents` | Delete everything |
| `POST` | `/api/chat` | Ask a question (`question`, optional `topK`, optional `fileIds`) |

**All ids are opaque 24-character hex strings** (MongoDB ObjectIds). They are only
ever compared, used as React keys, and pasted into paths — never parsed or sorted.

---

## Testing each flow by hand

With the backend running and `npm run dev` up:

| Flow | Steps | Expected |
| --- | --- | --- |
| **Health** | Load the page | Badge reads "Connected" in green; clicking it lists MongoDB (`rag_db`, `chunks_vector_index`) and Ollama with both model names |
| **Upload** | Drag `sample.pdf` from the backend repo onto the drop zone | Progress bar, then "Indexing…", then a summary: 1 page, 1,285 characters, 2 chunks stored |
| **Document list** | Look at the knowledge base panel | A `sample.pdf` row, status **READY**, with page and chunk counts and "just now" |
| **Chunks** | Click **View chunks** on that row | Two previews in document order, `#0` and `#1`, each with a page number and length |
| **Ask** | Ask "What is the refund policy?" | An answer citing the handbook, with `tookMs` and the source count beneath it |
| **Sources** | Expand **Sources** under the answer | Card 1 reads `sample.pdf · page 1`, **strong match**, showing the chunk text; "Show more" reveals all 900 characters |
| **Scope** | Open **Choose documents**, untick everything but `sample.pdf`, ask again | Header says "Asking 1 of N documents"; every source card is `sample.pdf` |
| **Unknown** | Ask something the PDF does not cover | "I don't know based on the provided documents." |
| **Download** | Click the filename on a source card | The original PDF opens in a new tab |
| **Delete one** | Click **Delete** on a row | Dialog names the file; confirming removes the row and updates the counters |
| **Clear all** | Click **Clear knowledge base** | Dialog states it deletes everything and cannot be undone, and stays disabled until you type `DELETE` |

Failure paths worth checking too:

| Case | Expected |
| --- | --- |
| Upload a `.txt` | "Only PDF files are allowed (.pdf, application/pdf)." — shown instantly, with no request sent |
| Upload a file over 20 MB | "File too large. Maximum allowed size is 20 MB." — also client-side, no request sent |
| Upload the same PDF twice | "Already indexed — showing the existing document." Informational, not a failure |
| Send a 1001-character question | Counter turns red, "too long to send", the Send button is disabled |
| Cancel a question mid-flight | "Request cancelled." No error bubble |
| Stop the backend, then click the badge's **Check again** | Red badge and a banner: "Cannot reach the backend at http://localhost:5050. Is it running?" |
| A scanned/image-only PDF | The backend's 422 message about needing OCR, shown verbatim |

---

## How it is put together

```text
src/
├── api/client.js          every fetch/XHR call in the app, and nowhere else
├── hooks/
│   ├── useHealth.js       polls /api/health every 30s
│   ├── useDocuments.js    the file list, stats, pagination, deletes, chunk loading
│   └── useChat.js         the conversation and the in-flight, abortable request
├── components/            presentation only — these never touch the network
└── utils/format.js        bytes, similarity bands, relative time
```

The rule worth keeping: **components never call `fetch` directly.** Every network
call goes through `src/api/client.js`, and components consume the hooks.

A few decisions that are easy to undo by accident:

- **Upload uses `XMLHttpRequest`, everything else uses `fetch`.** `fetch` cannot
  report upload progress. The XHR is wrapped in a promise so `client.js` still
  exposes a plain `async` function.
- **`FormData` is sent without a `Content-Type` header.** The browser must set it
  so the multipart boundary is included; setting it by hand breaks the upload.
- **No client-side timeout on upload.** A large PDF is embedded one small batch
  at a time and the request is synchronous, so it can legitimately run minutes.
- **The download endpoint never goes through the JSON helper** — it returns raw
  bytes, so it is a plain `<a href>`.
- **`sources[].content` is rendered as text, never HTML.** It is untrusted text
  extracted from a user's PDF; newlines are preserved with `white-space: pre-wrap`.

---

## Known limits

- **No streaming.** Answers arrive complete in one response, typically after
  1.5–6 seconds, which is why the loading state is mandatory.
- **No conversation memory.** Each question is answered independently against the
  documents; earlier turns are not sent as context.
- **No auth.** No login, no API keys, no per-user separation — anyone who can
  reach the backend can read, upload and delete everything.
- **20 MB upload cap**, one PDF per request.
- **Uploads are synchronous.** There is no job queue and no progress endpoint, so
  a large PDF holds the request open until indexing finishes.
- **Scanned PDFs do not work.** Image-only PDFs have no extractable text and are
  rejected with a 422; they would need OCR first.
- **The vector index is eventually consistent.** A question asked in the same
  second as an upload may not see the new document yet. The UI hints at this
  rather than reporting it as an error — asking again picks it up.
