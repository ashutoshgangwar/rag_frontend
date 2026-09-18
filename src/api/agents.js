/**
 * The agent endpoints.
 *
 *   GET  /api/agents                       → { groups, agents }
 *   POST /api/agents/:agentId/run          → { runId, result: { kind, text }, tookMs }
 *   POST /api/agents/runs/:runId/messages  → { text, tookMs }
 *
 * All three go through request(), so the Bearer token, the `success` check
 * and the 401 → sign-out behaviour are the same as every other call.
 *
 * No client-side timeout: answers come from a local model and can take a
 * minute. The backend gives up on Ollama at 120 s and answers 504, which is
 * what ends a request that is genuinely stuck.
 */

import { request } from './http.js'

export async function fetchAgents({ signal } = {}) {
  const body = await request('/api/agents', { signal })
  return {
    groups: Array.isArray(body.groups) ? body.groups : [],
    agents: Array.isArray(body.agents) ? body.agents : [],
  }
}

export async function runAgent(agentId, input, { signal } = {}) {
  const body = await request(`/api/agents/${encodeURIComponent(agentId)}/run`, {
    method: 'POST',
    json: { input },
    signal,
  })
  return {
    runId: body.runId,
    // Any kind renders as text — `answer` is the only one today.
    text: typeof body.result?.text === 'string' ? body.result.text : '',
    tookMs: body.tookMs,
  }
}

export async function askFollowUp(runId, question, { signal } = {}) {
  const body = await request(`/api/agents/runs/${encodeURIComponent(runId)}/messages`, {
    method: 'POST',
    json: { question },
    signal,
  })
  return { text: typeof body.text === 'string' ? body.text : '', tookMs: body.tookMs }
}

const UNAVAILABLE = 'The AI service is unavailable or timed out. Please try again.'

/**
 * What to show for a failed agent call: a headline, the server's own text in
 * smaller type when the headline is ours, and per-field messages on a 400.
 * 401 never gets here in practice — request() has already signed the user
 * out and the screen is swapping to the sign-in form.
 */
export function describeAgentError(error) {
  if (error?.network || [502, 503, 504].includes(error?.status)) {
    return { message: UNAVAILABLE, detail: error?.message || null, status: error?.status ?? null, fields: {} }
  }
  return {
    message: error?.message || 'Something went wrong. Please try again.',
    detail: null,
    status: error?.status ?? null,
    fields: error?.details?.fields && typeof error.details.fields === 'object' ? error.details.fields : {},
  }
}
