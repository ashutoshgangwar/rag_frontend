import { useCallback, useEffect, useState } from 'react'
import { fetchAgents } from '../api/agents.js'
import { isAbortError } from '../api/http.js'

/**
 * The agent catalog from GET /api/agents, in the server's order. Owned above
 * the agent routes so moving between the hub and an agent page never refetches.
 */
export function useAgents() {
  const [agents, setAgents] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetchAgents({ signal: controller.signal })
      .then((body) => {
        setAgents(body.agents)
        setGroups(body.groups)
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
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  return { agents, groups, loading, error, reload }
}
