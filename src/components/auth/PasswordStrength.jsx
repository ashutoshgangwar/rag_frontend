import { passwordStrength } from '../../utils/validation.js'

const SEGMENTS = [1, 2, 3, 4]

/**
 * The meter under the sign-up password field. Encouragement only — a "fair"
 * password still submits; validateNewPassword is what actually blocks one.
 */
export default function PasswordStrength({ value }) {
  if (!value) return null
  const { score, label, key } = passwordStrength(value)

  return (
    <div className={`strength strength-${key}`}>
      <div className="strength-bars" aria-hidden="true">
        {SEGMENTS.map((segment) => (
          <span key={segment} className={segment <= score ? 'on' : ''} />
        ))}
      </div>
      <span className="strength-label" role="status">
        {label} password
      </span>
    </div>
  )
}
