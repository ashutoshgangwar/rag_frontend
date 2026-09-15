/**
 * Field-level checks for the sign-in and sign-up forms. No network, no React.
 *
 * These exist to catch obvious mistakes instantly rather than after a round
 * trip — the server is still the authority and re-validates all of it. Each
 * validator returns an error string, or null when the value is fine.
 */

export const MIN_PASSWORD_LENGTH = 8
export const MAX_PASSWORD_LENGTH = 128
export const MIN_NAME_LENGTH = 2
export const MAX_NAME_LENGTH = 80

/**
 * Deliberately loose. The only email that truly validates is one that receives
 * mail, so this catches typos — a missing @, a trailing dot — and lets
 * everything else through to the server rather than rejecting a legitimate
 * address the regex had not heard of.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function validateName(value) {
  const name = value.trim()
  if (!name) return 'Enter your full name.'
  if (name.length < MIN_NAME_LENGTH) return 'That name looks too short.'
  if (name.length > MAX_NAME_LENGTH) return `Keep your name under ${MAX_NAME_LENGTH} characters.`
  return null
}

export function validateEmail(value) {
  const email = value.trim()
  if (!email) return 'Enter your email address.'
  if (!EMAIL_RE.test(email)) return 'That does not look like an email address.'
  return null
}

/**
 * Phone numbers are typed with spaces, dashes and brackets and stored without
 * them, so the check counts digits rather than matching a format. 7 to 15 is
 * the E.164 range — anything narrower rejects somebody's real number.
 */
export function validatePhone(value) {
  const raw = value.trim()
  if (!raw) return 'Enter your phone number.'
  if (raw.includes('@')) return 'That looks like an email. Put it in the email field.'
  if (/[^\d\s+()-]/.test(raw)) return 'Use digits, spaces, +, - and brackets only.'

  const digits = raw.replace(/\D/g, '')
  if (digits.length < 7) return 'That phone number looks too short.'
  if (digits.length > 15) return 'That phone number looks too long.'
  return null
}

/**
 * Sign-in takes one box for either an email or a phone number, split on the
 * `@` exactly the way the backend splits it — so what the form accepts and
 * what the server accepts cannot drift apart.
 */
export function identifierKind(value) {
  const raw = value.trim()
  if (!raw) return 'empty'
  return raw.includes('@') ? 'email' : 'phone'
}

export function validateIdentifier(value) {
  const kind = identifierKind(value)
  if (kind === 'empty') return 'Enter your email or phone number.'
  return kind === 'email' ? validateEmail(value) : validatePhone(value)
}

/** The company fields: present, and not absurdly long. */
export function validateRequiredText(value, { label, max = 120 }) {
  const text = value.trim()
  if (!text) return `Enter your ${label}.`
  if (text.length > max) return `Keep your ${label} under ${max} characters.`
  return null
}

/**
 * The band has to be one the backend recognises, so the check is membership in
 * the list the dropdown was built from rather than "is not empty".
 */
export function validateChoice(value, allowed, { label }) {
  if (!value) return `Choose your ${label}.`
  if (!allowed.includes(value)) return `Choose a ${label} from the list.`
  return null
}

/** Sign-in only checks that something was typed; the server decides the rest. */
export function validateSignInPassword(value) {
  if (!value) return 'Enter your password.'
  return null
}

/** Sign-up holds the line on length and a bit of variety. */
export function validateNewPassword(value) {
  if (!value) return 'Choose a password.'
  if (value.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return `Keep it under ${MAX_PASSWORD_LENGTH} characters.`
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Mix in at least one letter and one number.'
  }
  return null
}

export function validatePasswordConfirmation(password, confirmation) {
  if (!confirmation) return 'Re-type your password.'
  if (password !== confirmation) return 'The two passwords do not match.'
  return null
}

/**
 * A rough four-band score for the meter under the password field. It is
 * encouragement, not a gate — `validateNewPassword` is what actually blocks
 * a weak password, and a "fair" one still submits.
 */
export function passwordStrength(value) {
  if (!value) return { score: 0, label: 'Empty', key: 'empty' }

  let score = 0
  if (value.length >= MIN_PASSWORD_LENGTH) score += 1
  if (value.length >= 12) score += 1
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1
  if (/[0-9]/.test(value)) score += 1
  if (/[^A-Za-z0-9]/.test(value)) score += 1

  // A short password cannot climb out of the bottom band on variety alone.
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { score: 1, label: 'Too short', key: 'weak' }
  }

  if (score <= 2) return { score: 1, label: 'Weak', key: 'weak' }
  if (score === 3) return { score: 2, label: 'Fair', key: 'fair' }
  if (score === 4) return { score: 3, label: 'Good', key: 'good' }
  return { score: 4, label: 'Strong', key: 'strong' }
}

/** A name to greet by; falls back to the email's local part, then the phone. */
export function displayName(user) {
  const name = (user?.fullName || user?.name || '').trim()
  if (name) return name
  const email = user?.email || ''
  if (email) return email.split('@')[0]
  return user?.phone || 'there'
}

/** Up to two initials for the header avatar. */
export function initials(user) {
  const source = displayName(user)
  const parts = source.split(/[\s._-]+/).filter(Boolean)
  const letters = parts.length > 1 ? [parts[0][0], parts[parts.length - 1][0]] : [source[0]]
  return letters.filter(Boolean).join('').toUpperCase() || '?'
}
