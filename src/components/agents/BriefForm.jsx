import { useState } from 'react'
import AgentIcon from './AgentIcon.jsx'
import { initialValues } from '../../agents/catalog.js'

/**
 * The agent's intake form, built from `agent.fields`. Wide fields (textareas)
 * take a full row; everything else flows two or three to a row.
 *
 * Validation is only "required is filled" — the agent is the one that makes
 * sense of the values, so there is nothing stricter worth checking here.
 */
export default function BriefForm({ agent, initial, request, onSubmit }) {
  const [values, setValues] = useState(() => initial ?? initialValues(agent, request))
  const [touched, setTouched] = useState(false)

  const missing = agent.fields.filter(
    (field) => field.required && !String(values[field.name] ?? '').trim(),
  )

  const set = (name, value) => setValues((current) => ({ ...current, [name]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    setTouched(true)
    if (missing.length === 0) onSubmit(values)
  }

  // Examples fill the free-text field, which every answer agent has.
  const exampleTarget = agent.fields.find((field) => field.name === 'request')

  return (
    <form className="brief" onSubmit={handleSubmit} noValidate>
      <div className="brief-grid">
        {agent.fields.map((field) => {
          const id = `brief-${agent.id}-${field.name}`
          const invalid = touched && missing.includes(field)
          const common = {
            id,
            name: field.name,
            value: values[field.name] ?? '',
            onChange: (event) => set(field.name, event.target.value),
            'aria-invalid': invalid || undefined,
            required: field.required,
          }
          return (
            <div
              key={field.name}
              className={`brief-field ${field.wide || field.type === 'textarea' ? 'brief-field-wide' : ''} ${invalid ? 'brief-field-invalid' : ''}`}
            >
              <label htmlFor={id}>
                {field.label}
                {field.required && <span className="brief-required" aria-hidden="true"> *</span>}
              </label>
              {field.type === 'select' ? (
                <select {...common}>
                  {field.options.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              ) : field.type === 'textarea' ? (
                <textarea {...common} rows={field.rows ?? 3} placeholder={field.placeholder} />
              ) : (
                <input
                  {...common}
                  type={field.type}
                  placeholder={field.placeholder}
                  min={field.min}
                  max={field.max}
                />
              )}
              {invalid && <small className="brief-error">Required</small>}
            </div>
          )
        })}
      </div>

      {exampleTarget && agent.examples?.length > 0 && (
        <div className="brief-examples">
          <span className="muted">Try:</span>
          {agent.examples.map((example) => (
            <button
              type="button"
              key={example}
              className="chip"
              onClick={() => set(exampleTarget.name, example)}
            >
              {example}
            </button>
          ))}
        </div>
      )}

      <div className="brief-actions">
        {touched && missing.length > 0 && (
          <p className="brief-summary-error" role="alert">
            Fill in {missing.map((field) => field.label.toLowerCase()).join(', ')} to continue.
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-glow">
          <AgentIcon name="spark" size={16} />
          {agent.cta ?? 'Run agent'}
        </button>
      </div>
    </form>
  )
}
