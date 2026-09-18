/** Small display helpers. No network, no React. */

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  const decimals = exponent === 0 || value >= 100 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[exponent]}`
}

/** 0.6413 -> "64.1%" */
export function formatPercent(fraction, decimals = 1) {
  if (!Number.isFinite(fraction)) return '\u2014'
  return `${(fraction * 100).toFixed(decimals)}%`
}

/** Clamp a similarity into 0..1 so a bar width is always sane. */
export function clampFraction(value) {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}

/**
 * Cosine similarity does not start at zero in practice: a genuinely relevant
 * chunk scores roughly 0.75-0.90 and even a weak match sits near 0.6. Drawing
 * the raw score as a 0-100% bar would make every result look mediocre, so the
 * useful range is what gets labelled and what the bar is scaled across.
 */
export const SIMILARITY_FLOOR = 0.5
export const SIMILARITY_CEILING = 0.95

export function similarityBand(score) {
  if (!Number.isFinite(score)) return { key: 'unknown', label: 'unknown' }
  if (score >= 0.75) return { key: 'strong', label: 'strong match' }
  if (score >= 0.6) return { key: 'moderate', label: 'moderate match' }
  return { key: 'weak', label: 'weak match' }
}

/** Position within the useful range, 0..1 — for a bar width, not for display. */
export function similarityBarFraction(score) {
  if (!Number.isFinite(score)) return 0
  const span = SIMILARITY_CEILING - SIMILARITY_FLOOR
  return clampFraction((score - SIMILARITY_FLOOR) / span)
}

export function formatNumber(value) {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString()
}

/** 4305 -> "4.3 s"; 532 -> "532 ms" */
export function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

const RELATIVE_UNITS = [
  ['year', 365 * 24 * 60 * 60 * 1000],
  ['month', 30 * 24 * 60 * 60 * 1000],
  ['day', 24 * 60 * 60 * 1000],
  ['hour', 60 * 60 * 1000],
  ['minute', 60 * 1000],
  ['second', 1000],
]

/**
 * createdAt arrives as a UTC ISO string; Date parses it as UTC and every
 * comparison below happens against local "now", so the result is local.
 */
export function formatRelativeTime(isoString, now = Date.now()) {
  const timestamp = Date.parse(isoString)
  if (Number.isNaN(timestamp)) return '—'

  const deltaMs = timestamp - now
  const absMs = Math.abs(deltaMs)
  if (absMs < 10_000) return 'just now'

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [unit, unitMs] of RELATIVE_UNITS) {
    if (absMs >= unitMs || unit === 'second') {
      return formatter.format(Math.round(deltaMs / unitMs), unit)
    }
  }
  return 'just now'
}

/** Full local timestamp, for the `title` tooltip next to a relative time. */
export function formatAbsoluteTime(isoString) {
  const timestamp = Date.parse(isoString)
  if (Number.isNaN(timestamp)) return ''
  return new Date(timestamp).toLocaleString()
}

/** "18 Oct 2026" (in the user's locale's order) — a date, no time. */
export function formatDate(isoString) {
  const timestamp = Date.parse(isoString)
  if (Number.isNaN(timestamp)) return '—'
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    timestamp,
  )
}

export function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural
}
