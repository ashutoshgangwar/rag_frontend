import { useCallback, useEffect, useState } from 'react'
import { fetchAgents } from '../api/agents.js'
import { isAbortError } from '../api/http.js'

/**
 * The agent list for the hub. Loaded once per mount through the API layer, so
 * moving the catalog to the backend changes nothing here.
 */
export function useAgents() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchAgents({ signal: controller.signal })
      .then((list) => {
        setAgents(list)
        setError(null)
      })
      .catch((err) => {
        if (!isAbortError(err)) setError(err.message || 'Could not load agents.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [attempt])

  const reload = useCallback(() => {
    setLoading(true)
    setAttempt((value) => value + 1)
  }, [])

  return { agents, loading, error, reload }
}
