import { useCallback, useEffect, useState } from 'react'
import { isAbortError } from '../api/http.js'

/**
 * One GET, with loading, error and retry — the useAgents pattern, for the
 * billing and admin screens that each need a list or two.
 *
 * `load` must be stable (a module-level API function). `reload` keeps the
 * data on screen while the new copy is fetched, so saving a row does not
 * flash the whole table back to a skeleton.
 */
export function useResource(load, { enabled = true } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    load({ signal: controller.signal })
      .then((value) => {
        if (controller.signal.aborted) return
        setData(value)
        setError(null)
      })
      .catch((err) => {
        if (!isAbortError(err) && !controller.signal.aborted) setError(err.message || 'Something went wrong.')
      })
    return () => controller.abort()
  }, [load, enabled, attempt])

  const reload = useCallback(() => {
    setError(null)
    setAttempt((value) => value + 1)
  }, [])

  return { data, error, loading: enabled && data === null && error === null, reload, setData }
}
