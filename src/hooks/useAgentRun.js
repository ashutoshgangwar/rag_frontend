import { useCallback, useEffect, useRef, useState } from 'react'
import { confirmAgent, followUp, runAgent } from '../api/agents.js'
import { isAbortError } from '../api/http.js'

/**
 * One agent, one job, as a small state machine:
 *
 *   brief ──submit──▶ working ──▶ options ──select──▶ review ──confirm──▶ confirming ──▶ done
 *                        │                                 ◀──back──
 *                        └──────▶ answer ──ask──▶ (follow-up appended to the thread)
 *
 * `steps` is the live progress: every label the agent has reported for the
 * current call, the last one being the one in progress. Any failure lands in
 * `error` and returns to the phase it came from, so the user can just retry.
 */
export function useAgentRun(agent) {
  const [phase, setPhase] = useState('brief')
  const [steps, setSteps] = useState([])
  const [brief, setBrief] = useState(null)
  const [result, setResult] = useState(null)
  const [selected, setSelected] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [thread, setThread] = useState([])
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  /** Runs one API call with progress, cancellation and error handling. */
  const call = useCallback(async (fn, { onDone, fallback }) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSteps([])
    setError(null)
    try {
      const value = await fn({
        signal: controller.signal,
        onStep: (label) => setSteps((current) => [...current, label]),
      })
      if (!controller.signal.aborted) onDone(value)
    } catch (err) {
      if (isAbortError(err)) return
      setError(err.message || 'The agent could not finish. Please try again.')
      fallback()
    } finally {
      if (abortRef.current === controller) abortRef.current = null
    }
  }, [])

  const submit = useCallback(
    (input) => {
      setBrief(input)
      setResult(null)
      setSelected(null)
      setConfirmation(null)
      setThread([])
      setPhase('working')
      call((options) => runAgent(agent, input, options), {
        onDone: (value) => {
          setResult(value)
          setPhase(value.kind === 'answer' ? 'answer' : 'options')
        },
        fallback: () => setPhase('brief'),
      })
    },
    [agent, call],
  )

  const select = useCallback((option) => {
    setSelected(option)
    setPhase('review')
  }, [])

  const backToOptions = useCallback(() => setPhase('options'), [])

  const confirm = useCallback(() => {
    if (!selected) return
    setPhase('confirming')
    call((options) => confirmAgent(agent, brief, selected, options), {
      onDone: (value) => {
        setConfirmation(value)
        setPhase('done')
      },
      fallback: () => setPhase('review'),
    })
  }, [agent, brief, selected, call])

  const ask = useCallback(
    (question) => {
      const text = question.trim()
      if (!text || asking) return
      setThread((current) => [...current, { role: 'user', text }])
      setAsking(true)
      call((options) => followUp(agent, brief, text, options), {
        onDone: (value) => {
          setThread((current) => [...current, { role: 'agent', text: value.text }])
          setAsking(false)
        },
        fallback: () => setAsking(false),
      }).finally(() => setAsking(false))
    },
    [agent, brief, asking, call],
  )

  /** Stops whatever is running and goes back to the last stable screen. */
  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setAsking(false)
    setPhase((current) => (current === 'confirming' ? 'review' : current === 'working' ? 'brief' : current))
  }, [])

  const editBrief = useCallback(() => {
    abortRef.current?.abort()
    setPhase('brief')
  }, [])

  return {
    phase,
    steps,
    brief,
    result,
    selected,
    confirmation,
    thread,
    asking,
    error,
    submit,
    select,
    backToOptions,
    confirm,
    ask,
    cancel,
    editBrief,
  }
}
