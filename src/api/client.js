/**
 * The only module in the app that talks to the network.
 * Components consume the hooks in src/hooks, which consume this.
 */

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
).replace(/\/+$/, '')

/** Backend limits, mirrored here so we can validate before spending a round trip. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024
export const MAX_QUESTION_LENGTH = 1000
export const MIN_TOP_K = 1
export const MAX_TOP_K = 20
export const DEFAULT_TOP_K = 5
export const DEFAULT_PAGE_SIZE = 20

/**
 * Every failure the UI shows comes back as one of these.
 * `network: true` means we never reached the server, so there is no
 * `body.error` to show and the message is ours, not the backend's.
 */
export class ApiError extends Error {
  constructor(message, { status = null, network = false, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.network = network
    if (cause) this.cause = cause
  }
}

export function unreachableMessage() {
  return `Cannot reach the backend at ${API_BASE_URL}. Is it running?`
}

export function isAbortError(error) {
  return error?.name === 'AbortError'
}

function abortError() {
  // Matches what fetch throws so callers only need one check.
  return Object.assign(new Error('The request was aborted.'), { name: 'AbortError' })
}

/**
 * Ids are opaque 24-character hex strings (Mongo ObjectIds). They are only
 * ever compared, used as React keys, and pasted into a path — never parsed.
 */
export function isObjectId(value) {
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value)
}

/**
 * Single place that turns a response into either a parsed body or a thrown
 * ApiError. Every backend error — at any status — is { success, error }, so
 * we check both `res.ok` and `body.success`.
 */
async function parseResponse(res) {
  let body = null
  try {
    body = await res.json()
  } catch {
    // Non-JSON response (e.g. a proxy error page): fall through with body = null.
  }

  if (!res.ok || !body?.success) {
    throw new ApiError(
      body?.error || `Request failed with status ${res.status}.`,
      { status: res.status },
    )
  }
  return body
}

async function request(path, { method = 'GET', json, signal } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      // The backend answers GETs with an ETag and no Cache-Control, so a
      // revalidating cache is free to hand back a list that predates a delete
      // or an upload. Everything here is read-your-own-writes; never cache it.
      cache: 'no-store',
      headers: json ? { 'Content-Type': 'application/json' } : undefined,
      body: json ? JSON.stringify(json) : undefined,
    })
  } catch (err) {
    // A network-level failure throws before there is any body to parse.
    if (isAbortError(err)) throw err
    throw new ApiError(unreachableMessage(), { network: true, cause: err })
  }
  return parseResponse(res)
}

/**
 * GET /api/health
 * Returns 200 when healthy and 503 when degraded, with the same body shape,
 * so this resolves in both cases and the caller reads `success`. Only a
 * genuine network failure rejects.
 */
export async function getHealth({ signal } = {}) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}/api/health`, { signal, cache: 'no-store' })
  } catch (err) {
    if (isAbortError(err)) throw err
    throw new ApiError(unreachableMessage(), { network: true, cause: err })
  }

  try {
    const body = await res.json()
    if (body && typeof body === 'object') return body
  } catch {
    // fall through
  }
  throw new ApiError(`Health check returned an unreadable response (status ${res.status}).`, {
    status: res.status,
  })
}

/** GET /api/documents?limit=&offset= — the uploaded PDFs, newest first. */
export function listDocuments({ limit = DEFAULT_PAGE_SIZE, offset = 0, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  return request(`/api/documents?${params}`, { signal })
}

/** GET /api/documents/:id — one PDF's metadata and ingestion status. */
export function getDocument(id, { signal } = {}) {
  return request(`/api/documents/${encodeURIComponent(id)}`, { signal })
}

/** GET /api/documents/:id/chunks — previews only, never the embedding vector. */
export function listChunks(id, { limit = DEFAULT_PAGE_SIZE, offset = 0, signal } = {}) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  return request(`/api/documents/${encodeURIComponent(id)}/chunks?${params}`, { signal })
}

/**
 * GET /api/documents/:id/download streams raw PDF bytes, not JSON — so this
 * returns a URL for an <a href> / window.open and never goes through the JSON
 * helper, which would choke trying to parse it.
 */
export function documentDownloadUrl(id) {
  return `${API_BASE_URL}/api/documents/${encodeURIComponent(id)}/download`
}

/** DELETE /api/documents/:id — bytes, chunks and metadata. Irreversible. */
export function deleteDocument(id, { signal } = {}) {
  return request(`/api/documents/${encodeURIComponent(id)}`, { method: 'DELETE', signal })
}

/** DELETE /api/documents — wipes the whole knowledge base. Irreversible. */
export function deleteAllDocuments({ signal } = {}) {
  return request('/api/documents', { method: 'DELETE', signal })
}

/**
 * POST /api/chat
 *
 * `fileIds` scopes the search to specific PDFs. An empty or absent array means
 * "search everything", so we only send the key when there is a real subset.
 */
export function sendChat({ question, topK = DEFAULT_TOP_K, fileIds, signal } = {}) {
  const json = { question, topK }
  if (Array.isArray(fileIds) && fileIds.length > 0) json.fileIds = fileIds
  return request('/api/chat', { method: 'POST', json, signal })
}

/**
 * Client-side guard so obvious mistakes are reported instantly instead of
 * after a round trip. The backend re-validates all of this anyway.
 * Returns an error string, or null when the file looks sendable.
 */
export function validatePdfFile(file) {
  if (!file) return 'No file selected.'
  if (!/\.pdf$/i.test(file.name)) {
    return 'Only PDF files are allowed (.pdf, application/pdf).'
  }
  if (file.size === 0) {
    return 'The uploaded PDF is empty (0 bytes).'
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File too large. Maximum allowed size is 20 MB.'
  }
  return null
}

/**
 * The backend rejects anything that is not a resume/CV. Those rejections are
 * the one upload failure the user can fix by picking a different file, so the
 * UI gives them their own treatment instead of a red error string.
 */
const NOT_A_RESUME_RE =
  /(?:does not|doesn't|does not appear to|doesn't appear to)\s+look like a resume|only resumes?\s*(?:\/|or)\s*cvs?\b/i

export function isNotAResumeError(error) {
  const message = typeof error === 'string' ? error : error?.message
  return typeof message === 'string' && NOT_A_RESUME_RE.test(message)
}

/**
 * The rejection reads:
 *   "<file>" does not look like a resume. <reason>. Only resumes/CVs can be uploaded here.
 *
 * The first clause repeats the filename the notice already shows and the last
 * repeats our own headline, so both are dropped and only the reason — the one
 * part the user cannot see for themselves — is kept. A message that does not
 * match that shape is returned unchanged rather than mangled.
 */
export function notAResumeReason(error) {
  const message = (typeof error === 'string' ? error : error?.message) || ''
  const reason = message
    .replace(/^.*?(?:does not|doesn't)(?:\s+appear to)?\s+look like a resume[.:]?\s*/i, '')
    .replace(/\bonly resumes?[^.]*\.\s*$/i, '')
    .trim()
  return reason || null
}

/**
 * POST /api/documents/upload
 *
 * Uses XMLHttpRequest rather than fetch because fetch cannot report upload
 * progress. Wrapped in a promise so callers still just `await` it.
 *
 * `onProgress(fraction)` reports bytes sent, 0..1. Reaching 1 only means the
 * bytes arrived — the server then extracts, chunks and embeds, which is why
 * the UI switches to an indeterminate "Indexing…" state at that point.
 *
 * No timeout is set: a large PDF is embedded one small batch at a time and the
 * request is synchronous, so it can legitimately run for minutes.
 */
export function uploadDocument(file, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }

    const form = new FormData()
    // Field name must be `file`. Never set Content-Type by hand here: the
    // browser has to set it so the multipart boundary is included.
    form.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE_URL}/api/documents/upload`)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(event.loaded / event.total)
    }
    xhr.upload.onload = () => onProgress?.(1)

    const onAbortSignal = () => xhr.abort()
    const detach = () => signal?.removeEventListener('abort', onAbortSignal)
    signal?.addEventListener('abort', onAbortSignal, { once: true })

    xhr.onload = () => {
      detach()
      let body = null
      try {
        body = JSON.parse(xhr.responseText)
      } catch {
        // Non-JSON response: fall through with body = null.
      }
      if (xhr.status < 200 || xhr.status >= 300 || !body?.success) {
        reject(
          new ApiError(body?.error || `Upload failed with status ${xhr.status}.`, {
            status: xhr.status,
          }),
        )
        return
      }
      resolve(body)
    }

    xhr.onerror = () => {
      detach()
      reject(new ApiError(unreachableMessage(), { network: true }))
    }
    xhr.ontimeout = () => {
      detach()
      reject(new ApiError('The upload timed out.', { status: 0 }))
    }
    xhr.onabort = () => {
      detach()
      reject(abortError())
    }

    xhr.send(form)
  })
}
