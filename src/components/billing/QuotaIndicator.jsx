import AgentIcon from '../agents/AgentIcon.jsx'
import { useSubscription } from '../../subscription/SubscriptionContext.js'
import { navigate } from '../../hooks/useRoute.js'
import { planBadgeText, quotaText } from '../../subscription/quota.js'

/**
 * The header's quota badge. Subscribed: the plan and its end date, linking to
 * billing. Free: the count, turning amber at one and into "Upgrade" at zero.
 * Nothing at all until /me has answered — a guessed number is worse than none.
 */
export function QuotaBadge() {
  const { data, subscription } = useSubscription()
  if (!data) return null

  if (data.subscribed) {
    return (
      <button
        type="button"
        className="quota-badge quota-badge-plan"
        onClick={() => navigate('/account')}
        title="Your plan — open billing"
      >
        <AgentIcon name="spark" size={13} />
        {planBadgeText(subscription)}
      </button>
    )
  }

  const remaining = data.freePromptsRemaining ?? 0
  if (remaining <= 0) {
    return (
      <button type="button" className="quota-badge quota-badge-empty" onClick={() => navigate('/pricing')}>
        <AgentIcon name="spark" size={13} />
        Upgrade
      </button>
    )
  }

  return (
    <button
      type="button"
      className={`quota-badge ${remaining === 1 ? 'quota-badge-low' : ''}`}
      onClick={() => navigate('/pricing')}
      title="See plans"
    >
      {quotaText(data)}
    </button>
  )
}

/**
 * The line beside a send button. Free users only — a subscriber already has
 * the badge in the header and needs no running count. At zero it offers the
 * paywall in place, so whatever is typed in the box stays there.
 */
export function QuotaInline({ className = '' }) {
  const { data, openPaywall } = useSubscription()
  if (!data || data.subscribed) return null

  const remaining = data.freePromptsRemaining ?? 0
  if (!data.canPrompt || remaining <= 0) {
    return (
      <span className={`quota-inline quota-inline-empty ${className}`} role="status">
        No free prompts left.
        <button type="button" className="btn btn-small btn-primary" onClick={openPaywall}>
          Upgrade to continue
        </button>
      </span>
    )
  }

  return (
    <span className={`quota-inline ${remaining === 1 ? 'quota-inline-low' : ''} ${className}`} aria-live="polite">
      {quotaText(data)}
    </span>
  )
}
