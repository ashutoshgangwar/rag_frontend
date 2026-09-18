import { useSyncExternalStore } from 'react'

/**
 * The smallest router that does the job: the current pathname, plus a
 * `navigate` that pushes a history entry. Back and Forward work through
 * `popstate`. No dependency needed for a handful of paths.
 *
 * The route lives at module level rather than in each hook's state, so the
 * gate in App (which serves /pricing to signed-out visitors) and the
 * workspace under it always agree on where the user is.
 *
 * `state` rides along in history.state — the hub uses it to hand text the
 * user typed to the agent page without putting it in the URL.
 */
function read() {
  return { path: window.location.pathname, state: window.history.state ?? null }
}

let route = read()
const listeners = new Set()

function emit() {
  for (const listener of listeners) listener()
}

window.addEventListener('popstate', () => {
  route = read()
  emit()
})

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** `replace` rewrites the current entry — for dropping one-shot state. */
export function navigate(path, state = null, { replace = false } = {}) {
  if (replace) {
    window.history.replaceState(state, '', path)
  } else if (path !== window.location.pathname || state) {
    window.history.pushState(state, '', path)
  }
  route = { path, state }
  emit()
  if (!replace) window.scrollTo({ top: 0 })
}

export function useRoute() {
  const current = useSyncExternalStore(subscribe, () => route)
  return { path: current.path, state: current.state, navigate }
}

/** '/agents' → { page: 'hub' }; '/agents/tutor' → { page: 'agent', agentId: 'tutor' }; else null. */
export function matchAgentsRoute(path) {
  const match = path.match(/^\/agents(?:\/([^/]+))?\/?$/)
  if (!match) return null
  if (!match[1]) return { page: 'hub' }
  try {
    return { page: 'agent', agentId: decodeURIComponent(match[1]) }
  } catch {
    return { page: 'agent', agentId: match[1] }
  }
}

/** The single-page routes outside agents and documents. */
export function matchPageRoute(path) {
  if (/^\/pricing\/?$/.test(path)) return 'pricing'
  if (/^\/account(?:\/billing)?\/?$/.test(path)) return 'account'
  if (/^\/admin\/?$/.test(path)) return 'admin'
  return null
}
