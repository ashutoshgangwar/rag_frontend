import { useEffect, useRef, useState } from 'react'
import AgentIcon from './AgentIcon.jsx'
import AgentProgress from './AgentProgress.jsx'
import AnswerText from './AnswerText.jsx'
import BriefForm from './BriefForm.jsx'
import OptionCard from './OptionCard.jsx'
import { useAgentRun } from '../../hooks/useAgentRun.js'
import { formatINR } from '../../api/agents.js'

const OPTION_STAGES = ['Brief', 'Agent working', 'Pick one', 'Confirm']
const ANSWER_STAGES = ['Brief', 'Agent working', 'Answer']

const STAGE_OF = {
  brief: 0,
  working: 1,
  options: 2,
  answer: 2,
  review: 3,
  confirming: 3,
  done: 4,
}

/** The filled-in brief as label/value pairs, for the summary chips. */
function briefPairs(agent, brief) {
  if (!brief) return []
  return agent.fields
    .filter((field) => String(brief[field.name] ?? '').trim())
    .map((field) => [field.label, String(brief[field.name])])
}

function Stepper({ stages, current }) {
  return (
    <ol className="agent-stepper" aria-label="Progress">
      {stages.map((label, index) => {
        const state = index < current ? 'done' : index === current ? 'active' : 'todo'
        return (
          <li key={label} className={`agent-stepper-item agent-stepper-${state}`}>
            <span className="agent-stepper-dot" aria-hidden="true">
              {state === 'done' ? <AgentIcon name="check" size={11} strokeWidth={3} /> : index + 1}
            </span>
            <span className="agent-stepper-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

function FollowUp({ onAsk, disabled }) {
  const [text, setText] = useState('')
  const submit = (event) => {
    event.preventDefault()
    if (!text.trim() || disabled) return
    onAsk(text)
    setText('')
  }
  return (
    <form className="agent-followup" onSubmit={submit}>
      <label className="sr-only" htmlFor="agent-followup">Ask a follow-up</label>
      <input
        id="agent-followup"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Ask a follow-up, or ask me to change something…"
        disabled={disabled}
        autoComplete="off"
      />
      <button type="submit" className="btn btn-primary btn-icon" disabled={disabled || !text.trim()} aria-label="Send">
        <AgentIcon name="send" size={16} />
      </button>
    </form>
  )
}

export default function AgentSession({ agent, request, onBack, onRestart }) {
  const run = useAgentRun(agent)
  const topRef = useRef(null)
  const stages = agent.mode === 'answer' ? ANSWER_STAGES : OPTION_STAGES
  const pairs = briefPairs(agent, run.brief)

  // Every phase change is a new screen's worth of content: bring its top into view.
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [run.phase])

  return (
    <section className="agent-session" style={{ '--tint': agent.hue }} aria-label={`${agent.name} agent`}>
      <div className="agent-session-head" ref={topRef}>
        <button type="button" className="btn btn-small btn-ghost" onClick={onBack}>
          <AgentIcon name="back" size={16} />
          All agents
        </button>

        <div className="agent-session-title">
          <span className="agent-orb agent-orb-large" aria-hidden="true">
            <AgentIcon name={agent.icon} size={26} />
          </span>
          <div>
            <h2>{agent.name}</h2>
            <p className="muted">{agent.tagline}</p>
          </div>
        </div>

        <Stepper stages={stages} current={Math.min(STAGE_OF[run.phase] ?? 0, stages.length)} />
      </div>

      {run.error && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Something went wrong</p>
          <p>{run.error}</p>
        </div>
      )}

      {run.phase !== 'brief' && pairs.length > 0 && (
        <div className="brief-recap">
          <div className="brief-recap-chips">
            {pairs.map(([label, value]) => (
              <span key={label} className="recap-chip" title={`${label}: ${value}`}>
                <small>{label}</small>
                {value}
              </span>
            ))}
          </div>
          {run.phase !== 'working' && run.phase !== 'confirming' && run.phase !== 'done' && (
            <button type="button" className="btn btn-link" onClick={run.editBrief}>
              Edit brief
            </button>
          )}
        </div>
      )}

      <div className="agent-stage" key={run.phase}>
        {run.phase === 'brief' && (
          <div className="agent-card-panel">
            <h3 className="stage-title">Tell the agent what you need</h3>
            <BriefForm agent={agent} initial={run.brief} request={request} onSubmit={run.submit} />
          </div>
        )}

        {run.phase === 'working' && (
          <AgentProgress agent={agent} steps={run.steps} onCancel={run.cancel} />
        )}

        {run.phase === 'confirming' && (
          <AgentProgress
            agent={agent}
            steps={run.steps}
            title={`Confirming ${run.selected?.title ?? 'your selection'}`}
            onCancel={run.cancel}
          />
        )}

        {run.phase === 'options' && (
          <div className="agent-card-panel">
            <div className="stage-head">
              <h3 className="stage-title">
                {run.result?.options?.length
                  ? `${run.result.options.length} options found`
                  : 'Nothing matched'}
              </h3>
              {run.result?.note && <p className="muted">{run.result.note}</p>}
            </div>
            {run.result?.options?.length ? (
              <ul className="option-list">
                {run.result.options.map((option, index) => (
                  <OptionCard
                    key={option.id}
                    option={option}
                    index={index}
                    selected={run.selected?.id === option.id}
                    onSelect={run.select}
                  />
                ))}
              </ul>
            ) : (
              <p className="muted">Try widening the brief — a different date, area or budget.</p>
            )}
          </div>
        )}

        {run.phase === 'review' && run.selected && (
          <div className="agent-card-panel">
            <h3 className="stage-title">Review and confirm</h3>
            <div className="review-card">
              <div>
                <strong className="review-title">{run.selected.title}</strong>
                <p className="muted">{run.selected.subtitle}</p>
                {run.selected.details?.length > 0 && (
                  <ul className="option-details">
                    {run.selected.details.map((detail) => (
                      <li key={detail}>{detail}</li>
                    ))}
                  </ul>
                )}
              </div>
              {run.selected.price != null && (
                <div className="review-total">
                  <small className="muted">Total</small>
                  <strong>{formatINR(run.selected.price)}</strong>
                  {run.selected.priceNote && <small className="muted">{run.selected.priceNote}</small>}
                </div>
              )}
            </div>
            <div className="review-actions">
              <button type="button" className="btn" onClick={run.backToOptions}>
                Back to options
              </button>
              <button type="button" className="btn btn-primary btn-glow" onClick={run.confirm}>
                <AgentIcon name="check" size={16} strokeWidth={2.4} />
                {agent.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        )}

        {run.phase === 'done' && run.confirmation && (
          <div className="agent-card-panel success-panel">
            <span className="success-burst" aria-hidden="true">
              <AgentIcon name="check" size={30} strokeWidth={2.6} />
            </span>
            <h3>All done</h3>
            <p className="muted">{run.confirmation.message}</p>
            <p className="success-ref">
              Reference <code>{run.confirmation.reference}</code>
            </p>
            <dl className="success-details">
              {run.confirmation.details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <div className="review-actions">
              <button type="button" className="btn" onClick={onBack}>
                Back to agents
              </button>
              <button type="button" className="btn btn-primary" onClick={onRestart}>
                New {agent.name.toLowerCase()} request
              </button>
            </div>
          </div>
        )}

        {run.phase === 'answer' && run.result && (
          <div className="agent-card-panel">
            <article className="answer-card">
              <AnswerText text={run.result.text} />
            </article>

            {run.thread.map((turn, index) =>
              turn.role === 'user' ? (
                <div key={index} className="thread-user">
                  <span>{turn.text}</span>
                </div>
              ) : (
                <article key={index} className="answer-card answer-card-followup">
                  <AnswerText text={turn.text} />
                </article>
              ),
            )}

            {run.asking && <AgentProgress agent={agent} steps={run.steps} compact onCancel={run.cancel} />}

            <FollowUp onAsk={run.ask} disabled={run.asking} />
          </div>
        )}
      </div>
    </section>
  )
}
