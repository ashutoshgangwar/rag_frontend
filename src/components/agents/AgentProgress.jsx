import AgentIcon from './AgentIcon.jsx'

/**
 * The agent "thinking out loud": every step it has reported, ticked off as the
 * next one starts. The last step is the one in progress.
 */
export default function AgentProgress({ agent, steps, title, onCancel, compact = false }) {
  return (
    <div className={`agent-progress ${compact ? 'agent-progress-compact' : ''}`} role="status" aria-live="polite">
      {!compact && (
        <div className="agent-progress-head">
          <span className="agent-orb" aria-hidden="true">
            <AgentIcon name={agent.icon} size={22} />
          </span>
          <div>
            <strong>{title ?? `${agent.name} agent is working`}</strong>
            <p className="muted">You can cancel at any time.</p>
          </div>
        </div>
      )}

      <ol className="agent-steps">
        {steps.length === 0 && (
          <li className="agent-step agent-step-active">
            <span className="agent-step-mark" aria-hidden="true" />
            Starting…
          </li>
        )}
        {steps.map((label, index) => {
          const active = index === steps.length - 1
          return (
            <li key={`${index}-${label}`} className={`agent-step ${active ? 'agent-step-active' : 'agent-step-done'}`}>
              <span className="agent-step-mark" aria-hidden="true">
                {!active && <AgentIcon name="check" size={12} strokeWidth={3} />}
              </span>
              {label}
              {active && <span className="agent-step-dots" aria-hidden="true"><i /><i /><i /></span>}
            </li>
          )
        })}
      </ol>

      {onCancel && (
        <button type="button" className="btn btn-small" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  )
}
