/** Wording for the quota counter and the plan badge. No network, no React. */

import { formatDate, pluralize } from '../utils/format.js'

/** "2 of 5 free prompts left", or without the "of" when the limit is unknown. */
export function quotaText(data) {
  const remaining = Math.max(0, data?.freePromptsRemaining ?? 0)
  const limit = data?.freePromptLimit
  return Number.isFinite(limit)
    ? `${remaining} of ${limit} free ${pluralize(limit, 'prompt')} left`
    : `${remaining} free ${pluralize(remaining, 'prompt')} left`
}

/**
 * "Monthly · ends 18 Oct 2026". "Ends", not "renews": with no payment
 * gateway nothing renews on its own — a queued plan simply follows it.
 */
export function planBadgeText(subscription) {
  if (!subscription) return 'Subscribed'
  return subscription.endsAt
    ? `${subscription.planName} · ends ${formatDate(subscription.endsAt)}`
    : subscription.planName
}
