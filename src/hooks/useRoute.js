import { useCallback, useEffect, useState } from 'react'

/**
 * The smallest router that does the job: the current pathname, plus a
 * `navigate` that pushes a history entry. Back and Forward work through
 * `popstate`. No dependency needed for four paths.
 *
 * `state` rides along in history.state — the hub uses it to hand text the
 * user typed to the agent page without putting it in the URL.
 */
function current() {
  return { path: window.location.pathname, state: window.history.state ?? null }
}

export function useRoute() {
  const [route, setRoute] = useState(current)

  useEffect(() => {
    const onPop = () => setRoute(current())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((path, state = null) => {
    if (path !== window.location.pathname || state) {
      window.history.pushState(state, '', path)
    }
    setRoute({ path, state })
    window.scrollTo({ top: 0 })
  }, [])

  return { path: route.path, state: route.state, navigate }
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
