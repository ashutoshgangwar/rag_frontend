import { useCallback, useEffect, useRef, useState } from 'react'
import { getHealth, isAbortError } from '../api/client.js'

const POLL_INTERVAL_MS = 30_000

export function useHealth() {
  const [health, setHealth] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)
  const [lastCheckedAt, setLastCheckedAt] = useState(null)
  const abortRef = useRef(null)

  const check = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const body = await getHealth({ signal: controller.signal })
      setHealth(body)
      setStatus(body.success ? 'healthy' : 'degraded')
      setError(body.success ? null : body.error || 'One or more services are unavailable.')
      setLastCheckedAt(Date.now())
    } catch (err) {
      if (isAbortError(err)) return
      setHealth(null)
      setStatus('unreachable')
      setError(err.message)
      setLastCheckedAt(Date.now())
    }
  }, [])

  useEffect(() => {
    const run = async () => {
      await check()
    }
    run()
    const id = setInterval(run, POLL_INTERVAL_MS)
    return () => {
      clearInterval(id)
      abortRef.current?.abort()
    }
  }, [check])

  return { health, status, error, lastCheckedAt, refresh: check }
}
