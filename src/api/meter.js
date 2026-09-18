/**
 * Prompt metering, as the HTTP layer sees it.
 *
 * Chat, agent runs and agent follow-ups are metered. A success carries
 * `usage`; running out of free prompts is a 402 with
 * details.code === 'SUBSCRIPTION_REQUIRED'. Both are noticed in exactly one
 * place — parseResponse() in http.js — and announced here, so no component
 * or hook has to know a metered endpoint exists.
 *
 * No network and no React, for the same reason as session.js: http.js imports
 * this, and the subscription provider subscribes to it.
 */

export const SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED'

const paywallListeners = new Set()
const usageListeners = new Set()

/** Called by http.js on every JSON response body that has a `usage` object. */
export function reportUsage(usage) {
  if (!usage || typeof usage !== 'object') return
  for (const listener of usageListeners) listener(usage)
}

/** Called by http.js on a 402 SUBSCRIPTION_REQUIRED. */
export function reportPaywall({ message, details }) {
  const info = {
    message: message || null,
    freePromptLimit: Number.isFinite(details?.freePromptLimit) ? details.freePromptLimit : null,
    // Raw — the provider normalises them with the same adapter /plans uses.
    plans: Array.isArray(details?.plans) ? details.plans : null,
  }
  for (const listener of paywallListeners) listener(info)
}

export function isPaywallResponse(status, details) {
  return status === 402 && details?.code === SUBSCRIPTION_REQUIRED
}

/**
 * The error a metered call rejects with when the paywall opened. Callers use
 * it for one thing only: to put the user's text back instead of treating the
 * failure as an answer — the modal is already explaining it.
 */
export function isPaywallError(error) {
  return error?.paywall === true
}

/** Each returns its unsubscribe function. */
export function onUsage(listener) {
  usageListeners.add(listener)
  return () => usageListeners.delete(listener)
}

export function onPaywall(listener) {
  paywallListeners.add(listener)
  return () => paywallListeners.delete(listener)
}
