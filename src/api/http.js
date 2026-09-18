
import { clearSession, getAccessToken } from './session.js'
import { isPaywallResponse, reportPaywall, reportUsage } from './meter.js'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL

if (!configuredBaseUrl) {
  throw new Error(
    'VITE_API_BASE_URL is not set. Set it in .env to the base URL of the backend, ' +
      'no trailing slash, then restart the dev server — Vite reads .env only at startup.',
  )
}

export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '')

export class ApiError extends Error {
  constructor(message, { status = null, network = false, details = null, cause } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.network = network
    // The backend's optional structured extras, e.g. { fields: { name: msg } }.
    this.details = details
    if (cause) this.cause = cause
  }
}

export function unreachableMessage() {
  return `Cannot reach the backend at ${API_BASE_URL}. Is it running?`
}

export function isAbortError(error) {
  return error?.name === 'AbortError'
}

export function abortError() {
  // Matches what fetch throws so callers only need one check.
  return Object.assign(new Error('The request was aborted.'), { name: 'AbortError' })
}

/** The Authorization header, or nothing at all when signed out. */
export function authHeaders() {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * A 401 on any call means the token we hold is no longer good — expired, or
 * revoked from another device. Dropping the session here, at the one point
 * every request passes through, is what puts the user back on the sign-in
 * screen no matter which call noticed first.
 *
 * `skipAuthRedirect` exempts the sign-in call itself: a 401 there is a wrong
 * password, not an expired session, and it belongs in the form's error slot.
 */
export function noteUnauthorized(status) {
  if (status === 401) clearSession('expired')
}

function handleUnauthorized(status, { skipAuthRedirect }) {
  if (!skipAuthRedirect) noteUnauthorized(status)
}

/**
 * Single place that turns a response into either a parsed body or a thrown
 * ApiError. Every backend error — at any status — is { success, error }, so
 * we check both `res.ok` and `body.success`.
 */
export async function parseResponse(res, { skipAuthRedirect = false } = {}) {
  let body = null
  try {
    body = await res.json()
  } catch {
    // Non-JSON response (e.g. a proxy error page): fall through with body = null.
  }

  if (!res.ok || !body?.success) {
    handleUnauthorized(res.status, { skipAuthRedirect })
    const error = new ApiError(body?.error || `Request failed with status ${res.status}.`, {
      status: res.status,
      details: body?.details ?? null,
    })
    // Out of free prompts. Announced here, once, so the paywall opens no
    // matter which metered call hit it; the error still reaches the caller,
    // flagged, so it can hand the user's text back rather than show a failure.
    if (isPaywallResponse(res.status, error.details)) {
      error.paywall = true
      reportPaywall({ message: error.message, details: error.details })
    }
    throw error
  }

  // Metered calls report the remaining quota on every success.
  if (body.usage) reportUsage(body.usage)
  return body
}

export async function request(
  path,
  { method = 'GET', json, signal, auth = true, skipAuthRedirect = false } = {},
) {
  let res
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      // The backend answers GETs with an ETag and no Cache-Control, so a
      // revalidating cache is free to hand back a list that predates a delete
      // or an upload. Everything here is read-your-own-writes; never cache it.
      cache: 'no-store',
      headers: {
        ...(json ? { 'Content-Type': 'application/json' } : null),
        ...(auth ? authHeaders() : null),
      },
      body: json ? JSON.stringify(json) : undefined,
    })
  } catch (err) {
    // A network-level failure throws before there is any body to parse.
    if (isAbortError(err)) throw err
    throw new ApiError(unreachableMessage(), { network: true, cause: err })
  }
  return parseResponse(res, { skipAuthRedirect })
}
