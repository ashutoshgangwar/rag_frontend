import AgentIcon from './AgentIcon.jsx'
import { fieldsOf } from '../../agents/form.js'

const PREVIEW = 160

/**
 * The submitted form, collapsed. Once an answer is on screen the form is
 * locked — the conversation continues in the follow-up chat — and this is
 * what stands in its place. "Edit request" unlocks it with the values kept.
 */
export default function BriefSummary({ agent, values, onEdit }) {
  const filled = fieldsOf(agent)
    .map((field) => ({ field, value: String(values[field.name] ?? '').trim() }))
    .filter(({ value }) => value)

  const short = filled.filter(({ field }) => field.type !== 'textarea')
  const long = filled.filter(({ field }) => field.type === 'textarea')

  return (
    <div className="brief-summary">
      <div className="brief-summary-head">
        <h3>
          <AgentIcon name="check" size={15} strokeWidth={2.4} />
          Your request
        </h3>
        <button type="button" className="btn btn-small" onClick={onEdit}>
          Edit request
        </button>
      </div>

      {short.length > 0 && (
        <div className="brief-summary-chips">
          {short.map(({ field, value }) => (
            <span key={field.name} className="recap-chip" title={`${field.label || field.name}: ${value}`}>
              <small>{field.label || field.name}</small>
              {value}
            </span>
          ))}
        </div>
      )}

      {long.map(({ field, value }) => (
        <div key={field.name} className="brief-summary-text">
          <small>{field.label || field.name}</small>
          <p>{value.length > PREVIEW ? `${value.slice(0, PREVIEW - 1)}…` : value}</p>
        </div>
      ))}
    </div>
  )
}
