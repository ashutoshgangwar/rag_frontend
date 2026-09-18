import { useCallback, useState } from 'react'
import PlanFormDialog from './PlanFormDialog.jsx'
import { fetchAdminPlans, fetchAdminSettings, updateAdminSettings, updatePlan, validateFreePromptLimit } from '../../api/admin.js'
import { durationLabel, formatMoney } from '../../api/subscriptions.js'
import { useResource } from '../../hooks/useResource.js'
import { navigate } from '../../hooks/useRoute.js'
import { useSubscription } from '../../subscription/SubscriptionContext.js'

function FreeLimitSettings() {
  const settings = useResource(fetchAdminSettings)
  const { refresh } = useSubscription()
  // null until edited, so the field shows the server's value as it arrives.
  const [draft, setDraft] = useState(null)
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState(null)
  const [saved, setSaved] = useState(false)

  const current = settings.data?.freePromptLimit
  const value = draft ?? (Number.isFinite(current) ? String(current) : '')
  const error = attempted ? validateFreePromptLimit(value) : null
  const unchanged = draft === null || Number(value) === current

  const submit = async (event) => {
    event.preventDefault()
    setAttempted(true)
    if (validateFreePromptLimit(value) || unchanged) return
    setSaving(true)
    setServerError(null)
    setSaved(false)
    try {
      const next = await updateAdminSettings({ freePromptLimit: Number(value) })
      settings.setData(next)
      setDraft(null)
      setAttempted(false)
      setSaved(true)
      // The admin's own counter reads this limit too.
      refresh()
    } catch (err) {
      setServerError(err.message || 'Could not save the limit.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel" aria-labelledby="admin-settings-title">
      <div className="panel-head">
        <h3 id="admin-settings-title">Free prompts</h3>
      </div>

      {settings.loading && <div className="table-skeleton table-skeleton-short" aria-busy="true" />}

      {settings.error && !settings.data && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Could not load settings</p>
          <p>{settings.error}</p>
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={settings.reload}>
              Retry
            </button>
          </div>
        </div>
      )}

      {settings.data && (
        <form className="settings-form" onSubmit={submit} noValidate>
          <div className={`form-field ${error ? 'form-field-invalid' : ''}`}>
            <label htmlFor="free-limit">Free prompts per user</label>
            <div className="settings-row">
              <input
                id="free-limit"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={value}
                onChange={(event) => {
                  setDraft(event.target.value)
                  setSaved(false)
                }}
                disabled={saving}
                aria-invalid={error ? true : undefined}
                aria-describedby="free-limit-help"
              />
              <button type="submit" className="btn btn-primary" disabled={saving || unchanged}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
            <small id="free-limit-help" className={error ? 'form-error' : 'form-hint'}>
              {error || 'How many chat and agent prompts a user gets before a plan is required. 0 means none.'}
            </small>
          </div>
          {serverError && (
            <div className="notice notice-error" role="alert">
              <p>{serverError}</p>
            </div>
          )}
          {saved && (
            <p className="form-saved" role="status">
              Saved. Every user's limit is now {current}.
            </p>
          )}
        </form>
      )}
    </section>
  )
}

function PlansTable() {
  const plans = useResource(fetchAdminPlans)
  const { setData, reload } = plans
  const [editing, setEditing] = useState(undefined) // undefined: closed · null: new · plan: edit
  const [busyId, setBusyId] = useState(null)
  const [rowError, setRowError] = useState(null)
  const [notice, setNotice] = useState(null)

  const toggleActive = async (plan) => {
    setBusyId(plan.id)
    setRowError(null)
    setNotice(null)
    try {
      const updated = await updatePlan(plan.id, { active: !plan.active })
      setData((list) => list.map((item) => (item.id === plan.id ? (updated ?? { ...item, active: !plan.active }) : item)))
    } catch (err) {
      setRowError(`${plan.name}: ${err.message || 'could not be updated.'}`)
    } finally {
      setBusyId(null)
    }
  }

  const closeForm = useCallback(() => setEditing(undefined), [])

  const onSaved = (plan, { created }) => {
    setEditing(undefined)
    setNotice(`${plan?.name ?? 'Plan'} ${created ? 'created' : 'saved'}.`)
    // Re-read rather than patch in place: the server owns the sort order.
    reload()
  }

  const list = plans.data ?? []

  return (
    <section className="panel" aria-labelledby="admin-plans-title">
      <div className="panel-head">
        <h3 id="admin-plans-title">Plans</h3>
        <div className="panel-head-meta">
          <button type="button" className="btn btn-small" onClick={() => navigate('/pricing')}>
            View pricing page
          </button>
          <button type="button" className="btn btn-small btn-primary" onClick={() => setEditing(null)} disabled={!plans.data}>
            New plan
          </button>
        </div>
      </div>

      {notice && (
        <div className="notice notice-success" role="status">
          <p>{notice}</p>
        </div>
      )}
      {rowError && (
        <div className="notice notice-error" role="alert">
          <p>{rowError}</p>
        </div>
      )}

      {plans.loading && <div className="table-skeleton" aria-busy="true" aria-label="Loading plans" />}

      {plans.error && !plans.data && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Could not load plans</p>
          <p>{plans.error}</p>
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={reload}>
              Retry
            </button>
          </div>
        </div>
      )}

      {plans.data && list.length === 0 && (
        <div className="empty-state">
          <p className="empty-title">No plans yet</p>
          <p className="muted">Create one and it appears on the pricing page straight away.</p>
        </div>
      )}

      {list.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Plan</th>
                <th scope="col" className="num">Price</th>
                <th scope="col">Period</th>
                <th scope="col" className="num">Order</th>
                <th scope="col">Active</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((plan) => (
                <tr key={plan.id} className={plan.active ? '' : 'row-inactive'}>
                  <td>
                    <div className="plan-cell">
                      <strong>{plan.name}</strong>
                      <code>{plan.id}</code>
                      {plan.description && <span className="muted">{plan.description}</span>}
                    </div>
                  </td>
                  <td className="num">{formatMoney(plan.amount, plan.currency)}</td>
                  <td>{durationLabel(plan)}</td>
                  <td className="num">{plan.order ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={plan.active}
                      aria-label={`${plan.name} on sale`}
                      className={`switch ${plan.active ? 'switch-on' : ''}`}
                      onClick={() => toggleActive(plan)}
                      disabled={busyId === plan.id}
                    >
                      <span className="switch-thumb" aria-hidden="true" />
                    </button>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn-small" onClick={() => setEditing(plan)}>
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing !== undefined && <PlanFormDialog plan={editing} onClose={closeForm} onSaved={onSaved} />}
    </section>
  )
}

/**
 * /admin — plans and the free-prompt limit. Only routed for role === 'admin';
 * the backend answers 403 to anyone else regardless.
 */
export default function AdminPage() {
  return (
    <div className="page admin-page">
      <header className="page-head">
        <h2 className="page-title">Admin</h2>
        <p className="muted">
          Plans and limits take effect immediately. Plans are never deleted — switch one off to take it off sale.
        </p>
      </header>
      <FreeLimitSettings />
      <PlansTable />
    </div>
  )
}
