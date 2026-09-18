import { useEffect, useRef, useState } from 'react'
import AgentIcon from './AgentIcon.jsx'
import AnswerText from './AnswerText.jsx'
import CopyButton from './CopyButton.jsx'
import { LIMITS } from '../../agents/form.js'
import { formatDuration, formatNumber } from '../../utils/format.js'

const DISCLAIMER = 'AI-generated. Check important details before using.'

/**
 * Shown while the model works. It reserves the space an answer will take, so
 * the page does not jump when the answer replaces it, and counts the seconds
 * so a 40-second wait reads as progress rather than a hang.
 */
export function ThinkingCard({ agent, compact = false, onCancel }) {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const started = Date.now()
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className={`thinking-card ${compact ? 'thinking-card-compact' : ''}`} role="status" aria-live="polite">
      <span className="agent-orb thinking-orb" aria-hidden="true">
        <AgentIcon name={agent.icon} size={compact ? 18 : 22} />
      </span>
      <div className="thinking-copy">
        <strong>
          Thinking<span className="thinking-dots" aria-hidden="true"><i /><i /><i /></span>
        </strong>
        <span className="muted">
          {seconds < 15
            ? `${seconds}s — answers usually take 5–60 seconds.`
            : `${seconds}s — the local model is still writing. Longer answers take longer.`}
        </span>
      </div>
      {onCancel && (
        <button type="button" className="btn btn-small" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}

function FollowUpForm({ disabled, onAsk }) {
  const [text, setText] = useState('')
  const length = text.trim().length
  const over = length > LIMITS.question
  const canSend = length > 0 && !over && !disabled

  const submit = async (event) => {
    event.preventDefault()
    if (!canSend) return
    // The question moves into the thread while it is answered; if that
    // fails it comes back here, unless the user has started typing again.
    const sent = text
    setText('')
    if (!(await onAsk(sent))) setText((current) => current || sent)
  }

  return (
    <form className="followup" onSubmit={submit}>
      <label className="followup-label" htmlFor="agent-followup">
        <AgentIcon name="send" size={13} />
        Continue the chat — the agent remembers this conversation
      </label>
      <div className="followup-row">
        <textarea
          id="agent-followup"
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) submit(event)
          }}
          placeholder="Ask a follow-up question…  (Enter to send)"
          disabled={disabled}
          aria-invalid={over || undefined}
          aria-describedby="agent-followup-count"
        />
        <button type="submit" className="btn btn-primary btn-icon" disabled={!canSend} aria-label="Send follow-up">
          <AgentIcon name="send" size={16} />
        </button>
      </div>
      <small id="agent-followup-count" className={`brief-counter ${over ? 'over' : ''}`}>
        {formatNumber(length)} / {formatNumber(LIMITS.question)}
        {over && ' — too long to send'}
      </small>
    </form>
  )
}

function AgentError({ error, onReset }) {
  return (
    <div className="notice notice-error" role="alert">
      <p className="notice-title">{error.message}</p>
      {error.detail && <p className="notice-detail">{error.detail}</p>}
      {error.status === 409 && (
        <div className="notice-actions">
          <button type="button" className="btn btn-small" onClick={onReset}>
            New request
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * The first answer, then the follow-up thread under it, then the input for
 * the next question.
 */
export default function AgentResult({ agent, run, thread, pendingQuestion, askError, onAsk, onCancelAsk, onReset }) {
  const endRef = useRef(null)
  const turns = thread.length
  // Only an explicit `allowCode: false` from the server hides code, so an
  // agent that never sends the flag renders exactly as before.
  const allowCode = agent.allowCode !== false

  // A new turn (or the pending question) lands at the bottom: keep it in view.
  useEffect(() => {
    if (turns > 0 || pendingQuestion) endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [turns, pendingQuestion])

  return (
    <section className="agent-result" aria-label="Answer">
      <div className="result-head">
        <h3>Answer</h3>
        <div className="result-meta">
          {Number.isFinite(run.tookMs) && <span className="muted">{formatDuration(run.tookMs)}</span>}
          <CopyButton text={run.text} />
          <button type="button" className="btn btn-small" onClick={onReset}>
            <AgentIcon name="refresh" size={14} />
            New request
          </button>
        </div>
      </div>

      <article className="answer-card">
        <AnswerText text={run.text} allowCode={allowCode} />
      </article>
      <p className="ai-disclaimer">{DISCLAIMER}</p>

      {thread.length > 0 && (
        <ol className="thread" aria-label="Follow-up questions">
          {thread.map((turn) =>
            turn.role === 'user' ? (
              <li key={turn.id} className="thread-user">
                <span>{turn.text}</span>
              </li>
            ) : (
              <li key={turn.id} className="thread-agent">
                <article className="answer-card answer-card-followup">
                  <AnswerText text={turn.text} allowCode={allowCode} />
                </article>
                <div className="thread-agent-meta">
                  {Number.isFinite(turn.tookMs) && <span className="muted">{formatDuration(turn.tookMs)}</span>}
                  <CopyButton text={turn.text} />
                </div>
                <p className="ai-disclaimer">{DISCLAIMER}</p>
              </li>
            ),
          )}
        </ol>
      )}

      {pendingQuestion && (
        <div className="thread">
          <div className="thread-user">
            <span>{pendingQuestion}</span>
          </div>
          <ThinkingCard agent={agent} compact onCancel={onCancelAsk} />
        </div>
      )}

      {askError && <AgentError error={askError} onReset={onReset} />}

      <div ref={endRef} />
      <FollowUpForm disabled={Boolean(pendingQuestion)} onAsk={onAsk} />
    </section>
  )
}
