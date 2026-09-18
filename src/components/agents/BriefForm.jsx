import AgentIcon from './AgentIcon.jsx'
import { LIMITS, fieldType, fieldsOf, promptField } from '../../agents/form.js'
import { formatNumber } from '../../utils/format.js'
import { QuotaInline } from '../billing/QuotaIndicator.jsx'
import { useSubscription } from '../../subscription/SubscriptionContext.js'

/**
 * An agent's form, built from `agent.fields`. Fully controlled: values and
 * errors live in the page, so "New request" can clear the answer and keep
 * what was typed, and a failed request never loses the input.
 *
 * `errors` is one message per field name — the page merges the client-side
 * check with whatever the server sent back. While `running`, every field is
 * locked so the request on screen is the one being answered.
 */
export default function BriefForm({ agent, values, errors, formError, running, onChange, onSubmit, onCancel }) {
  const { canPrompt } = useSubscription()
  const fields = fieldsOf(agent)
  const exampleTarget = promptField(agent)
  const examples = Array.isArray(agent.examples) ? agent.examples.filter((text) => typeof text === 'string') : []

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!running && canPrompt) onSubmit()
  }

  return (
    <form className="brief" onSubmit={handleSubmit} noValidate>
      {formError && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">{formError.message}</p>
          {formError.detail && <p className="notice-detail">{formError.detail}</p>}
        </div>
      )}

      {/* A disabled fieldset locks every field at once while the agent works. */}
      <fieldset className="brief-fieldset" disabled={running}>
        <div className="brief-grid">
          {fields.map((field) => {
            const type = fieldType(field)
            const id = `brief-${agent.id}-${field.name}`
            const errorId = `${id}-error`
            const counterId = `${id}-count`
            const error = errors[field.name]
            const value = values[field.name] ?? ''
            const common = {
              id,
              name: field.name,
              value,
              onChange: (event) => onChange(field.name, event.target.value),
              'aria-invalid': error ? true : undefined,
              'aria-required': field.required ? true : undefined,
              'aria-describedby': [error && errorId, type === 'textarea' && counterId].filter(Boolean).join(' ') || undefined,
            }
            const length = String(value).trim().length

            return (
              <div
                key={field.name}
                className={`brief-field ${field.wide || type === 'textarea' ? 'brief-field-wide' : ''} ${error ? 'brief-field-invalid' : ''}`}
              >
                <label htmlFor={id}>
                  {field.label || field.name}
                  {field.required && (
                    <span className="brief-required">
                      <span aria-hidden="true"> *</span>
                      <span className="sr-only"> (required)</span>
                    </span>
                  )}
                </label>

                {type === 'select' ? (
                  <select {...common}>
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : type === 'textarea' ? (
                  <textarea {...common} rows={Number(field.rows) || 4} placeholder={field.placeholder} />
                ) : type === 'number' ? (
                  <input {...common} type="number" inputMode="decimal" placeholder={field.placeholder} min={field.min} max={field.max} />
                ) : (
                  <input {...common} type="text" placeholder={field.placeholder} />
                )}

                <div className="brief-field-foot">
                  {error ? (
                    <small id={errorId} className="brief-error">{error}</small>
                  ) : (
                    <span />
                  )}
                  {type === 'textarea' && (
                    <small id={counterId} className={`brief-counter ${length > LIMITS.textarea ? 'over' : ''}`}>
                      {formatNumber(length)} / {formatNumber(LIMITS.textarea)}
                    </small>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {exampleTarget && examples.length > 0 && (
          <div className="brief-examples">
            <span className="muted">Try:</span>
            {examples.map((example) => (
              <button
                type="button"
                key={example}
                className="chip"
                onClick={() => onChange(exampleTarget.name, example)}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </fieldset>

      <div className="brief-actions">
        <QuotaInline className="brief-quota" />
        {running && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary btn-glow" disabled={running || !canPrompt} aria-busy={running}>
          <AgentIcon name="spark" size={16} />
          {running ? 'Thinking…' : agent.cta || 'Run'}
        </button>
      </div>
    </form>
  )
}
