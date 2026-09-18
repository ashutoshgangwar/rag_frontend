# Rangify Intelligence

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

## Plans, quota and the paywall

Chat, agent runs and agent follow-ups are metered by the backend: a few free
prompts (set by an admin), then **HTTP 402** until the user buys a plan.

- **One place handles it.** `parseResponse()` in `src/api/http.js` spots a 402
  with `details.code === 'SUBSCRIPTION_REQUIRED'` and any `usage` on a success,
  and announces both through `src/api/meter.js`. `SubscriptionProvider`
  (`src/subscription/`) is the only listener: it opens the paywall and keeps the
  counter current. No component knows which endpoints are metered.
- **The typed text survives a 402.** The chat box and follow-up box get it back,
  the agent form never loses it, and the refused question is taken out of the
  thread. Subscribe, then press Send again.
- **`GET /api/subscriptions/me` is the source of truth.** It is fetched on sign-in
  (and on load with a stored token), after a purchase and after any 402. Between
  those, `usage` updates the counter. Signing out clears it.
- **Buying goes through `purchasePlan(planId)`** in the provider. No payment is
  taken yet: the plan activates immediately. The `TODO: payment gateway` there
  is where checkout goes.
- **Routes:** `/pricing` (open to signed-out visitors; Subscribe signs in first
  and comes back with the plan's confirmation open), `/account` (billing status
  and history), `/admin` (plans and the free limit; routed only for
  `role === 'admin'`).

## Prerequisites

1. **Node.js 18+** (Vite requires it). Check with `node -v`.
2. **The RAG backend must already be running**, along with its MongoDB Atlas
   connection and a local Ollama with `llama3.2` and `nomic-embed-text` pulled.

Confirm the backend is up before starting the frontend — whatever
`VITE_API_BASE_URL` in your `.env` points at:

```bash
curl "$VITE_API_BASE_URL/api/health"
```

You want `"success": true` with both services `reachable`.

> **macOS note.** Do not run the backend on port 5000. The AirPlay Receiver
> listens there and answers every request with an empty `403`, so requests never
> reach Express. Either turn it off in *System Settings → General → AirDrop &
> Handoff*, or run the backend on another port and set `VITE_API_BASE_URL` to
> match.

---

## Installation

```bash
npm install
npm run dev
```

`.env` is the only place any URL or port is configured, and it is gitignored, so
a fresh clone needs one created first — see **Configuration** below for the
three keys. Vite prints the local URL on startup.

Other scripts:

```bash
npm run build     # production build into dist/
npm run preview   # serve that build
npm run lint      # eslint
```

---

## Configuration

**Every URL and port this app uses comes from `.env`.** Nothing in `src/` or
`vite.config.js` carries a default, and there is no `.env.example` to drift out
of sync with it — `.env` is the single source of truth.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | Base URL of the backend, no trailing slash |
| `VITE_DEV_PORT` | no | Port for `npm run dev` and `npm run preview` |
| `VITE_PREVIEW_PORT` | no | Splits `preview` off `VITE_DEV_PORT` when they differ |
| `VITE_AUTH_MOCK` | no | `true` fakes signup/login in the browser; see **Accounts** |

`VITE_API_BASE_URL` is read once, in [`src/api/http.js`](src/api/http.js), and
never hardcoded in a component. **It has no fallback on purpose**: leave it unset
and the app throws a named error at boot rather than quietly aiming at a port
somebody guessed — a wrong default is a much harder failure to read than a
missing one.

The ports are read in [`vite.config.js`](vite.config.js) via `loadEnv`, because
`import.meta.env` does not exist while the config itself is being evaluated.
Leave them unset and Vite picks its own default. They use no `VITE_` client
exposure beyond the prefix: the dev port is build tooling and never reaches the
browser.

Vite reads env files **at startup only**, so restart the dev server after editing
`.env` — a running server will not pick the change up.

---

## Accounts

The app is behind a sign-in wall. Signed out, the only thing rendered is the
sign-in / create-account screen; signed in, the three panels above.

### Signing in

**One input, not two.** The login form asks for "Email or phone" and sends it as
a single `identifier`. The backend splits on the `@` — with one it is an email,
without one it is a phone number — and the form applies exactly that rule to
pick its icon and its validation, so what the form accepts and what the server
accepts cannot drift apart.

**Keep me signed in** off puts the session in `sessionStorage`, so it ends with
the tab; on, it goes to `localStorage`.

### Creating an account

Nine fields is a long scroll and a discouraging one, so signup is two steps:

1. **Your account** — `fullName`, `email`, `phone`, `password`, `confirmPassword`
2. **Your company** — `companyName`, `designation`, `employeeStrength`, `companyIndustry`

Step 1 is validated before step 2 appears. If a step-2 submit turns up a problem
left behind on step 1, the form jumps back to it — an error message on a field
nobody can see is a dead end.

Both `email` and `phone` are required, because login accepts either as the
identifier and there is no signing in with a phone number the account never
stored. `employeeStrength` is a dropdown over the exact bands the backend takes
(`1-10`, `11-50`, `51-200`, `201-500`, `501-1000`, `1000+`). `companyIndustry`
is free text with a datalist of suggestions behind it, so an industry nobody put
on the list still gets through.

Signup signs you straight in — there is no "now go and log in" second step.

### Session handling

- The token is attached as `Authorization: Bearer <token>` to every request,
  upload included.
- **A 401 from any endpoint drops the session** and returns you to the sign-in
  screen with "Your session expired". That happens in one place — the HTTP layer
  — so it does not matter which call noticed first. The three auth calls are
  exempt: a 401 on login is a wrong password, not an expired token.
- Sign-out in one tab signs the other tabs out too, via a `storage` event.
- On boot, a stored token is checked against `/api/auth/me` before the workspace
  is shown. A 401 there signs you out; an *unreachable* backend does not — being
  offline says nothing about whether the token is valid.

### The contract

Everything the app assumes lives at the top of
[`src/api/auth.js`](src/api/auth.js) and nowhere else:

| Method | Path | Sends | Expects |
| --- | --- | --- | --- |
| `POST` | `/api/auth/signup` | the nine fields above | `{ user, token }` |
| `POST` | `/api/auth/login` | `{ identifier, password }` | `{ user, token }` |
| `GET` | `/api/auth/me` | — (bearer token) | `{ user }` |
| `POST` | `/api/auth/logout` | — | — (the client discards the token either way) |

The response readers are deliberately tolerant — `token`/`accessToken`,
`id`/`_id`, `fullName`/`name`, and a nested `data` wrapper all work. If the shape
still does not match, `AUTH_ENDPOINTS`, `toSignUpBody`, `toSignInBody`, `toUser`
and `toToken` are the five things to edit. No component or hook knows an
endpoint or a field name.

Phone numbers are normalised before they are sent: spaces, dashes and brackets
come off, a leading `+` stays. That is how people type a number and not how a
lookup matches one.

### Working without the backend

Set `VITE_AUTH_MOCK=true` in `.env` and the whole flow works offline: accounts
are kept in `localStorage`, nothing leaves the browser, and the sign-in screen
says so in a footnote. Unset it once the API is live — the mock is one clearly
marked block at the bottom of `src/api/auth.js` and can be deleted outright.

---

## The API contract it consumes

Base URL `VITE_API_BASE_URL`. Every request carries the session bearer token
(see **Accounts** above). Every error, at any status code, is
`{ "success": false, "error": "Human readable message" }`, which is why error
handling lives in exactly one helper.

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
| Stop the backend, then click the badge's **Check again** | Red badge and a banner: "Cannot reach the backend at &lt;your VITE_API_BASE_URL&gt;. Is it running?" |
| A scanned/image-only PDF | The backend's 422 message about needing OCR, shown verbatim |

---

## How it is put together

```text
src/
├── App.jsx                the gate: auth screen or workspace, decided once
├── api/
│   ├── session.js         where the token lives; no network, no React
│   ├── http.js            base URL, ApiError, the auth header, the 401 rule
│   ├── auth.js            signup / login / logout / me, and the offline mock
│   └── client.js          documents and chat
├── auth/
│   ├── AuthContext.js     the context and the useAuth hook
│   └── AuthProvider.jsx   subscribes to session.js and owns signed-in state
├── hooks/
│   ├── useHealth.js       polls /api/health every 30s
│   ├── useDocuments.js    the file list, stats, pagination, deletes, chunk loading
│   └── useChat.js         the conversation and the in-flight, abortable request
├── components/
│   ├── auth/              the signed-out screen, its two forms and the backdrop
│   └── Workspace.jsx      everything behind the wall
└── utils/
    ├── format.js          bytes, similarity bands, relative time
    └── validation.js      email / phone / identifier checks, password strength
```

The rule worth keeping: **components never call `fetch` directly.** Every network
call goes through `src/api/`, and components consume the hooks.

`session.js` is the single source of truth for the signed-in session, and it is
deliberately free of React: the HTTP layer needs the token and the provider needs
the user, and if either kept its own copy they would drift. `AuthProvider`
subscribes rather than storing, which is what makes a 401 on any request — or a
sign-out in another tab — show up as a re-render with no callback plumbing.

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
- **A 401 on the sign-in call does not clear the session.** It is a wrong
  password, not an expired token; `skipAuthRedirect` marks the three auth calls
  that are exempt from the automatic sign-out.
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
