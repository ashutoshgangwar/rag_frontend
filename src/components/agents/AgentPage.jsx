import { useRef, useState } from 'react'
import AgentIcon from './AgentIcon.jsx'
import AgentResult, { ThinkingCard } from './AgentResult.jsx'
import BriefForm from './BriefForm.jsx'
import BriefSummary from './BriefSummary.jsx'
import { accentOf, initialValues, validateValues } from '../../agents/form.js'
import { useAgentRun } from '../../hooks/useAgentRun.js'

/**
 * One agent: its form on top, the answer and follow-ups below.
 *
 * The form is locked from the moment it is submitted: disabled while the
 * agent thinks, then collapsed to a summary once the answer is in, because
 * from there the conversation continues in the follow-up chat. "Edit
 * request" (or "New request") unlocks it with every value kept.
 *
 * Field errors come from two places and are shown together: the client-side
 * check (live, once a submit has been attempted) and the server's
 * details.fields from a 400 (until that field is edited).
 */
export default function AgentPage({ agent, prompt, onBack }) {
  const [values, setValues] = useState(() => initialValues(agent, prompt))
  const [attempted, setAttempted] = useState(false)
  const [serverErrors, setServerErrors] = useState({})
  const session = useAgentRun(agent.id)
  const outputRef = useRef(null)
  const formRef = useRef(null)

  const client = validateValues(agent, values)
  const errors = { ...serverErrors, ...(attempted ? client.fields : {}) }

  const onChange = (name, value) => {
    setValues((current) => ({ ...current, [name]: value }))
    setServerErrors((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const onSubmit = async () => {
    setAttempted(true)
    if (client.error) return
    setServerErrors({})
    // Bring the thinking card into view; it holds the answer's place.
    requestAnimationFrame(() => outputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }))
    const error = await session.submit(client.input)
    if (!error) return
    // A 400 carries per-field messages; anything else only has the top message.
    if (error.status === 400) setServerErrors(error.fields)
    // The error is shown at the top of the form, which may be off screen by now.
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }

  const formError = attempted && client.error
    ? { message: `Please fix the highlighted field${Object.keys(client.fields).length > 1 ? 's' : ''}.`, detail: client.error }
    : session.runError

  const answered = !session.running && Boolean(session.run)

  return (
    <div className="agent-page" style={{ '--tint': accentOf(agent) }}>
      <header className="agent-page-head">
        <button type="button" className="btn btn-small btn-ghost" onClick={onBack}>
          <AgentIcon name="back" size={16} />
          All agents
        </button>
        <div className="agent-page-title">
          <span className="agent-orb agent-orb-large" aria-hidden="true">
            <AgentIcon name={agent.icon} size={26} />
          </span>
          <div>
            <h2>{agent.name}</h2>
            {agent.tagline && <p className="muted">{agent.tagline}</p>}
          </div>
        </div>
      </header>

      <section className="agent-panel" ref={formRef} aria-label={`${agent.name} form`}>
        {answered ? (
          <BriefSummary agent={agent} values={values} onEdit={session.reset} />
        ) : (
          <BriefForm
            agent={agent}
            values={values}
            errors={errors}
            formError={formError}
            running={session.running}
            onChange={onChange}
            onSubmit={onSubmit}
            onCancel={session.cancel}
          />
        )}
      </section>

      <div ref={outputRef} className="agent-output">
        {session.running && <ThinkingCard agent={agent} onCancel={session.cancel} />}

        {answered && (
          <AgentResult
            agent={agent}
            run={session.run}
            thread={session.thread}
            pendingQuestion={session.pendingQuestion}
            askError={session.askError}
            onAsk={session.ask}
            onCancelAsk={session.cancel}
            onReset={session.reset}
          />
        )}
      </div>
    </div>
  )
}
