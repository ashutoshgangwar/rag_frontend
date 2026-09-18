import { useCallback, useEffect, useRef, useState } from 'react'
import { askFollowUp, describeAgentError, runAgent } from '../api/agents.js'
import { isAbortError } from '../api/http.js'

let turnCounter = 0
const nextTurnId = () => `t${++turnCounter}`

/**
 * One agent page's conversation: the first answer (a run) and the follow-ups
 * asked on it.
 *
 * Everything lives in state only — the backend has no endpoint to read a run
 * back, so a refresh starts over by design.
 *
 * Each submit is a new run with a new runId; the previous answer and thread
 * are dropped when it starts. A request in flight is aborted by a newer one,
 * by `cancel`, by `reset` and by leaving the page.
 */
export function useAgentRun(agentId) {
  const [run, setRun] = useState(null) // { runId, text, tookMs }
  const [thread, setThread] = useState([]) // { id, role: 'user' | 'agent', text, tookMs? }
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState(null)
  const [pendingQuestion, setPendingQuestion] = useState(null)
  const [askError, setAskError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const begin = () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    return controller
  }

  const finish = (controller) => {
    if (abortRef.current === controller) abortRef.current = null
  }

  /** Resolves to the error shown (so the page can map field errors), or null. */
  const submit = useCallback(
    async (input) => {
      const controller = begin()
      setRun(null)
      setThread([])
      setPendingQuestion(null)
      setAskError(null)
      setRunError(null)
      setRunning(true)
      try {
        const result = await runAgent(agentId, input, { signal: controller.signal })
        setRun(result)
        return null
      } catch (err) {
        if (isAbortError(err)) return null
        const described = describeAgentError(err)
        setRunError(described)
        return described
      } finally {
        finish(controller)
        if (!controller.signal.aborted) setRunning(false)
      }
    },
    [agentId],
  )

  /** Resolves true when the question was answered, so the input can be cleared. */
  const ask = useCallback(
    async (question) => {
      const text = question.trim()
      if (!text || !run?.runId) return false
      const controller = begin()
      setAskError(null)
      setPendingQuestion(text)
      try {
        const answer = await askFollowUp(run.runId, text, { signal: controller.signal })
        setThread((current) => [
          ...current,
          { id: nextTurnId(), role: 'user', text },
          { id: nextTurnId(), role: 'agent', text: answer.text, tookMs: answer.tookMs },
        ])
        return true
      } catch (err) {
        if (!isAbortError(err)) setAskError(describeAgentError(err))
        return false
      } finally {
        finish(controller)
        if (!controller.signal.aborted) setPendingQuestion(null)
      }
    },
    [run],
  )

  /** Stops whatever is in flight and keeps everything already on screen. */
  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRunning(false)
    setPendingQuestion(null)
  }, [])

  /** "New request": clears the answer and thread; the form keeps its values. */
  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setRun(null)
    setThread([])
    setRunning(false)
    setRunError(null)
    setPendingQuestion(null)
    setAskError(null)
  }, [])

  return {
    run,
    thread,
    running,
    runError,
    asking: pendingQuestion !== null,
    pendingQuestion,
    askError,
    submit,
    ask,
    cancel,
    reset,
  }
}
