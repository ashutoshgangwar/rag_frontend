import { useCallback, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.js'
import { isAbortError } from '../../api/http.js'
import {
  identifierKind,
  validateIdentifier,
  validateSignInPassword,
} from '../../utils/validation.js'
import Field from './Field.jsx'
import { AtIcon, LockIcon, MailIcon, PhoneIcon } from './Icons.jsx'

/** What the single identifier box is currently holding. */
const KIND_LABEL = { email: 'Email', phone: 'Phone', empty: null }

export default function SignInForm({ onSwitchToSignUp }) {
  const { signIn, pending } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  // A field only shows its error once the user has left it — complaining
  // about a half-typed email is noise, not help.
  const [touched, setTouched] = useState({})
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)

  const kind = identifierKind(identifier)

  const validate = useCallback(
    () => ({
      identifier: validateIdentifier(identifier),
      password: validateSignInPassword(password),
    }),
    [identifier, password],
  )

  const markTouched = (field) => () => {
    setTouched((current) => ({ ...current, [field]: true }))
    setErrors(validate())
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (pending) return

    const found = validate()
    setErrors(found)
    setTouched({ identifier: true, password: true })
    if (found.identifier || found.password) return

    setFormError(null)
    try {
      await signIn({ identifier, password, remember })
      // On success this unmounts with the sign-in screen; nothing to reset.
    } catch (err) {
      if (isAbortError(err)) return
      setFormError(err.message)
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      <div className="auth-form-head stagger" style={{ '--i': 0 }}>
        <h2>Welcome back</h2>
        <p className="muted">Sign in to reach your knowledge base.</p>
      </div>

      {formError && (
        <div className="notice notice-error shake" role="alert">
          <strong>Could not sign you in</strong>
          <p>{formError}</p>
        </div>
      )}

      <div className="stagger" style={{ '--i': 1 }}>
        <Field
          label="Email or phone"
          type="text"
          value={identifier}
          onChange={setIdentifier}
          onBlur={markTouched('identifier')}
          error={touched.identifier ? errors.identifier : null}
          // One box, not a toggle: the backend splits on the `@` itself, so
          // asking the user which they are about to type is asking them to do
          // the server's job.
          icon={kind === 'phone' ? <PhoneIcon /> : kind === 'email' ? <MailIcon /> : <AtIcon />}
          adornment={
            KIND_LABEL[kind] && (
              <span className={`kind-pill kind-${kind}`} role="status">
                {KIND_LABEL[kind]}
              </span>
            )
          }
          autoComplete="username"
          placeholder="you@company.com or 98765 43210"
          disabled={pending}
          autoFocus
        />
      </div>

      <div className="stagger" style={{ '--i': 2 }}>
        <Field
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          onBlur={markTouched('password')}
          error={touched.password ? errors.password : null}
          icon={<LockIcon />}
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={pending}
        />
      </div>

      <label className="checkbox stagger" style={{ '--i': 3 }}>
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          disabled={pending}
        />
        <span>
          Keep me signed in
          <span className="muted"> — off means the session ends with this tab.</span>
        </span>
      </label>

      <button
        type="submit"
        className="btn btn-glow btn-block stagger"
        style={{ '--i': 4 }}
        disabled={pending}
      >
        {pending ? <span className="btn-working">Signing you in</span> : 'Sign in'}
      </button>

      <p className="auth-switch stagger" style={{ '--i': 5 }}>
        New to Rangify?{' '}
        <button type="button" className="btn-link" onClick={onSwitchToSignUp} disabled={pending}>
          Create an account
        </button>
      </p>
    </form>
  )
}
