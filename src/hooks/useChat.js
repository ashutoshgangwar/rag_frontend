import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_TOP_K, isAbortError, sendChat } from '../api/client.js'
import { isPaywallError } from '../api/meter.js'

let messageCounter = 0
const nextId = () => `m${++messageCounter}`

/**
 * The vector index is eventually consistent. A question asked within this
 * window of an upload that finds nothing is very likely just a race, not a
 * real miss — worth saying so instead of implying the document is unusable.
 */
const FRESH_UPLOAD_WINDOW_MS = 15_000

/** The backend's stock non-answer, verbatim. */
const NO_ANSWER_PREFIX = "I don't know based on the provided documents"

/**
 * The race shows up two ways: no sources at all, or — more often, once other
 * documents are indexed — sources from everything *except* the file that just
 * landed, and a stock non-answer. Both are worth explaining.
 */
function looksLikeIndexLag(answer, sources) {
  if (sources.length === 0) return true
  return typeof answer === 'string' && answer.trim().startsWith(NO_ANSWER_PREFIX)
}

/**
 * Owns the conversation and the in-flight request.
 *
 * The backend does not stream and can take 6+ seconds, so every request is
 * abortable: Cancel aborts it, and so does unmounting. An AbortError is a
 * deliberate cancel, never something to show the user as a failure.
 *
 * There is no conversation memory on the backend — each question is answered
 * independently — so nothing here is sent as history.
 *
 * `ask` resolves false when the question was not used up and belongs back in
 * the input — today only when the free prompts have run out, where the
 * paywall (opened by the HTTP layer) explains it and the user resends after
 * subscribing.
 */
export function useChat() {
  const [messages, setMessages] = useState([])
  const [pending, setPending] = useState(false)
  const abortRef = useRef(null)
  const lastUploadAtRef = useRef(0)

  useEffect(() => () => abortRef.current?.abort(), [])

  /** Called after a successful upload so a too-soon empty answer can explain itself. */
  const noteUpload = useCallback(() => {
    lastUploadAtRef.current = Date.now()
  }, [])

  const ask = useCallback(
    async (question, { topK = DEFAULT_TOP_K, fileIds = [], scope = null } = {}) => {
      const trimmed = question.trim()
      if (!trimmed || abortRef.current) return false

      const controller = new AbortController()
      abortRef.current = controller

      const askedAt = Date.now()
      const questionId = nextId()
      setMessages((current) => [
        ...current,
        { id: questionId, role: 'user', content: trimmed, scope, createdAt: askedAt },
      ])
      setPending(true)

      try {
        const body = await sendChat({
          question: trimmed,
          topK,
          fileIds,
          signal: controller.signal,
        })
        const sources = body.sources || []
        setMessages((current) => [
          ...current,
          {
            id: nextId(),
            role: 'assistant',
            content: body.answer,
            sources,
            tookMs: body.tookMs,
            note: body.note || null,
            topK,
            scope,
            // Only a hint, and only when it actually explains the result.
            justIndexed:
              looksLikeIndexLag(body.answer, sources) &&
              askedAt - lastUploadAtRef.current < FRESH_UPLOAD_WINDOW_MS,
            createdAt: Date.now(),
          },
        ])
        return true
      } catch (err) {
        if (isAbortError(err)) {
          setMessages((current) => [
            ...current,
            { id: nextId(), role: 'system', content: 'Request cancelled.', createdAt: Date.now() },
          ])
          return true
        }
        if (isPaywallError(err)) {
          // Not asked after all: out of the thread, back into the input.
          setMessages((current) => current.filter((message) => message.id !== questionId))
          return false
        }
        setMessages((current) => [
          ...current,
          { id: nextId(), role: 'assistant', error: err.message, createdAt: Date.now() },
        ])
        return true
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setPending(false)
      }
    },
    [],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const clearConversation = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
  }, [])

  return { messages, pending, ask, cancel, clearConversation, noteUpload }
}
