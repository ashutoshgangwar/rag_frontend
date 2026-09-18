import { useState } from 'react'
import { fetchSubscriptionHistory, formatMoney, periodLabel, phaseLabel, subscriptionPhase } from '../../api/subscriptions.js'
import { useAuth } from '../../auth/AuthContext.js'
import { useResource } from '../../hooks/useResource.js'
import { navigate } from '../../hooks/useRoute.js'
import { useSubscription } from '../../subscription/SubscriptionContext.js'
import { quotaText } from '../../subscription/quota.js'
import { formatDate } from '../../utils/format.js'
import { displayName } from '../../utils/validation.js'

const PHASE_PILL = {
  active: 'pill-ready',
  upcoming: 'pill-upcoming',
  expired: 'pill-muted',
  cancelled: 'pill-failed',
  canceled: 'pill-failed',
}

function CurrentPlan() {
  const { data, error, loading, retry, subscription } = useSubscription()

  if (loading) {
    return <div className="billing-card billing-card-skeleton" aria-busy="true" aria-label="Loading your plan" />
  }
  if (error && !data) {
    return (
      <div className="notice notice-error" role="alert">
        <p className="notice-title">Could not load your plan</p>
        <p>{error}</p>
        <div className="notice-actions">
          <button type="button" className="btn btn-small" onClick={retry}>
            Retry
          </button>
        </div>
      </div>
    )
  }
  if (!data) return null

  if (data.subscribed && subscription) {
    return (
      <div className="billing-card billing-card-active">
        <div>
          <span className="pill pill-ready">Active</span>
          <h4>{subscription.planName}</h4>
          <p className="muted">
            {formatMoney(subscription.amount, subscription.currency)} {periodLabel(subscription)} · started{' '}
            {formatDate(subscription.startsAt)} · ends {formatDate(subscription.endsAt)}
          </p>
        </div>
        <button type="button" className="btn btn-small" onClick={() => navigate('/pricing')}>
          Extend or add a plan
        </button>
      </div>
    )
  }

  const empty = !data.canPrompt
  return (
    <div className={`billing-card ${empty ? 'billing-card-empty' : ''}`}>
      <div>
        <span className="pill pill-muted">Free</span>
        <h4>No active plan</h4>
        <p className="muted">
          You have {quotaText(data)}. {empty ? 'Subscribe to keep using chat and AI agents.' : ''}
        </p>
      </div>
      <button type="button" className="btn btn-primary btn-small" onClick={() => navigate('/pricing')}>
        See plans
      </button>
    </div>
  )
}

function History() {
  // Fetched on every visit; nothing on this page can buy a plan, so it
  // cannot go stale while open.
  const history = useResource(fetchSubscriptionHistory)
  const { reload } = history
  // "Upcoming" is judged against the moment the page opened.
  const [now] = useState(() => Date.now())

  if (history.loading) {
    return <div className="table-skeleton" aria-busy="true" aria-label="Loading history" />
  }
  if (history.error && !history.data) {
    return (
      <div className="notice notice-error" role="alert">
        <p className="notice-title">Could not load your billing history</p>
        <p>{history.error}</p>
        <div className="notice-actions">
          <button type="button" className="btn btn-small" onClick={reload}>
            Retry
          </button>
        </div>
      </div>
    )
  }
  if (!history.data?.length) {
    return (
      <div className="empty-state">
        <p className="empty-title">No purchases yet</p>
        <p className="muted">Plans you buy will be listed here.</p>
      </div>
    )
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">Plan</th>
            <th scope="col" className="num">Amount</th>
            <th scope="col">Start</th>
            <th scope="col">End</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {history.data.map((row) => {
            const phase = subscriptionPhase(row, now)
            return (
              <tr key={row.id || `${row.planId}-${row.startsAt}`}>
                <td>{row.planName}</td>
                <td className="num">{formatMoney(row.amount, row.currency)}</td>
                <td>{formatDate(row.startsAt)}</td>
                <td>{formatDate(row.endsAt)}</td>
                <td>
                  <span className={`pill ${PHASE_PILL[phase] ?? 'pill-muted'}`}>{phaseLabel(phase)}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** /account — who is signed in, and Billing: the current plan plus every purchase. */
export default function AccountPage() {
  const { user } = useAuth()

  return (
    <div className="page account-page">
      <header className="page-head">
        <h2 className="page-title">Account</h2>
        <p className="muted">
          {displayName(user)}
          {user?.email ? ` · ${user.email}` : ''}
          {user?.role === 'admin' ? ' · Admin' : ''}
        </p>
      </header>

      <section className="panel" aria-labelledby="billing-title">
        <div className="panel-head">
          <h3 id="billing-title">Billing</h3>
        </div>
        <CurrentPlan />
        <h4 className="section-subtitle">History</h4>
        <History />
      </section>
    </div>
  )
}
