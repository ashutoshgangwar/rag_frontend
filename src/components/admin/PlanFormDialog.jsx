import { useEffect, useRef, useState } from 'react'
import { PLAN_INTERVALS, PLAN_LIMITS, createPlan, planFormValues, updatePlan, validatePlanForm } from '../../api/admin.js'
import { formatMoney, periodLabel } from '../../api/subscriptions.js'

function Field({ id, label, error, hint, wide = false, children }) {
  return (
    <div className={`form-field ${wide ? 'form-field-wide' : ''} ${error ? 'form-field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? (
        <small id={`${id}-error`} className="form-error">
          {error}
        </small>
      ) : (
        hint && <small className="form-hint">{hint}</small>
      )}
    </div>
  )
}

/**
 * Create a plan (`plan` null) or edit one. The id is fixed once created.
 *
 * Errors come from two places, as on the agent form: the client check (shown
 * once a save has been attempted) and the server — its `error` at the top,
 * plus a field message where the failure clearly belongs to one field.
 */
export default function PlanFormDialog({ plan, onClose, onSaved }) {
  const creating = !plan
  const [values, setValues] = useState(() => planFormValues(plan))
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [serverFields, setServerFields] = useState({})
  const firstFieldRef = useRef(null)
  const savingRef = useRef(false)

  useEffect(() => {
    savingRef.current = saving
  })

  const { fields, body } = validatePlanForm(values, { original: plan })
  const errors = { ...serverFields, ...(attempted ? fields : {}) }

  useEffect(() => {
    const restore = document.activeElement
    firstFieldRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !savingRef.current) {
        event.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (restore instanceof HTMLElement) restore.focus()
    }
  }, [onClose])

  const set = (name) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setValues((current) => ({ ...current, [name]: value }))
    setServerFields((current) => {
      if (!(name in current)) return current
      const next = { ...current }
      delete next[name]
      return next
    })
  }

  const submit = async (event) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(fields).length > 0) return
    if (!creating && Object.keys(body).length === 0) {
      onClose()
      return
    }
    setSaving(true)
    setServerError(null)
    try {
      const saved = creating ? await createPlan(body) : await updatePlan(plan.id, body)
      onSaved(saved, { created: creating })
    } catch (err) {
      setServerError(err.message || 'Could not save the plan.')
      const detailFields = err.details?.fields
      if (detailFields && typeof detailFields === 'object') setServerFields(detailFields)
      else if (err.status === 409) setServerFields({ id: 'A plan with this id already exists.' })
      setSaving(false)
    }
  }

  const amount = Number(values.amount)
  const count = Number(values.intervalCount)
  const preview =
    !fields.amount && !fields.currency && !fields.intervalCount && values.amount !== ''
      ? `${formatMoney(amount, values.currency.trim().toUpperCase())} ${periodLabel({ interval: values.interval, intervalCount: count })}`
      : null

  const invalid = (name) => (errors[name] ? { 'aria-invalid': true, 'aria-describedby': `plan-${name}-error` } : {})

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form
        className="dialog plan-form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-form-title"
        onSubmit={submit}
        noValidate
      >
        <h2 id="plan-form-title">{creating ? 'New plan' : `Edit ${plan.name}`}</h2>

        {serverError && (
          <div className="notice notice-error" role="alert">
            <p>{serverError}</p>
          </div>
        )}

        <fieldset className="form-grid" disabled={saving}>
          <Field
            id="plan-id"
            label="Id"
            error={errors.id}
            hint={creating ? `${PLAN_LIMITS.idMin}–${PLAN_LIMITS.idMax} characters: a–z, 0–9 and dashes. Cannot be changed later.` : 'Fixed once the plan is created.'}
          >
            <input
              id="plan-id"
              ref={creating ? firstFieldRef : undefined}
              value={values.id}
              onChange={set('id')}
              disabled={!creating}
              autoComplete="off"
              spellCheck={false}
              placeholder="e.g. quarterly"
              {...invalid('id')}
            />
          </Field>

          <Field id="plan-name" label="Name" error={errors.name}>
            <input
              id="plan-name"
              ref={creating ? undefined : firstFieldRef}
              value={values.name}
              onChange={set('name')}
              maxLength={PLAN_LIMITS.name + 20}
              placeholder="e.g. Quarterly"
              {...invalid('name')}
            />
          </Field>

          <Field
            id="plan-description"
            label="Description"
            error={errors.description}
            hint={`${values.description.trim().length} / ${PLAN_LIMITS.description}`}
            wide
          >
            <textarea id="plan-description" rows={2} value={values.description} onChange={set('description')} {...invalid('description')} />
          </Field>

          <Field id="plan-amount" label="Price" error={errors.amount}>
            <input id="plan-amount" type="number" inputMode="decimal" min="0" step="0.01" value={values.amount} onChange={set('amount')} {...invalid('amount')} />
          </Field>

          <Field id="plan-currency" label="Currency" error={errors.currency}>
            <input
              id="plan-currency"
              value={values.currency}
              onChange={set('currency')}
              maxLength={3}
              autoComplete="off"
              spellCheck={false}
              className="input-upper"
              {...invalid('currency')}
            />
          </Field>

          <Field id="plan-interval" label="Billed every" error={errors.intervalCount || errors.interval}>
            <div className="input-pair">
              <input
                id="plan-interval"
                type="number"
                min={PLAN_LIMITS.countMin}
                max={PLAN_LIMITS.countMax}
                step="1"
                value={values.intervalCount}
                onChange={set('intervalCount')}
                aria-label="Interval count"
                {...(errors.intervalCount || errors.interval
                  ? { 'aria-invalid': true, 'aria-describedby': 'plan-interval-error' }
                  : {})}
              />
              <select value={values.interval} onChange={set('interval')} aria-label="Interval">
                {PLAN_INTERVALS.map((interval) => (
                  <option key={interval} value={interval}>
                    {interval}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <Field id="plan-order" label="Sort order" error={errors.order} hint="Lower numbers are listed first.">
            <input id="plan-order" type="number" step="1" value={values.order} onChange={set('order')} {...invalid('order')} />
          </Field>

          {!creating && (
            <label className="checkbox form-field-wide">
              <input type="checkbox" checked={values.active} onChange={set('active')} />
              <span>Active — on sale on the pricing page</span>
            </label>
          )}
        </fieldset>

        {preview && <p className="plan-form-preview">Shows as <strong>{preview}</strong></p>}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : creating ? 'Create plan' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
