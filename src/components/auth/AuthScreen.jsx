import { useState } from 'react'
import { USING_MOCK_AUTH } from '../../api/auth.js'
import { useAuth } from '../../auth/AuthContext.js'
import BrandMark from '../BrandMark.jsx'
import ThemeToggle from '../ThemeToggle.jsx'
import AuroraBackground from './AuroraBackground.jsx'
import SignInForm from './SignInForm.jsx'
import SignUpForm from './SignUpForm.jsx'
import { CheckIcon } from './Icons.jsx'

const POINTS = [
  ['Grounded answers', 'Every reply cites the exact chunk it was built from.'],
  ['Your documents only', 'Retrieval runs against what you upload — nothing else.'],
  ['Check any claim', 'Jump from a citation straight to the page in the source PDF.'],
]

/**
 * The whole signed-out surface: brand on one side, one form on the other.
 * Sign-in and sign-up swap in place rather than routing, so a half-filled form
 * is still there after a trip to the other tab.
 */
export default function AuthScreen() {
  const [mode, setMode] = useState('signin')
  const { notice, dismissNotice } = useAuth()

  return (
    <div className="auth-screen">
      <AuroraBackground />
      <ThemeToggle className="auth-theme" />

      <section className="auth-pitch">
        <div className="brand brand-large">
          <BrandMark size={40} />
          <div>
            <h1 className="gradient-text">Rangify Intelligence</h1>
            <p className="muted">Ask your documents. Verify every answer.</p>
          </div>
        </div>

        <ul className="auth-points">
          {POINTS.map(([title, body], index) => (
            <li key={title} className="stagger" style={{ '--i': index + 1 }}>
              <span className="point-check" aria-hidden="true">
                <CheckIcon />
              </span>
              <div>
                <strong>{title}</strong>
                <span className="muted">{body}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="auth-panel">
        {notice && (
          <div className="notice notice-warn auth-notice" role="status">
            <p>{notice}</p>
            <button type="button" className="btn btn-small" onClick={dismissNotice}>
              Dismiss
            </button>
          </div>
        )}

        {/* Two tabs rather than a link, so the choice is visible before the
            user has read a word of the form. The pill slides between them. */}
        <div
          className={`auth-tabs auth-tabs-${mode}`}
          role="tablist"
          aria-label="Sign in or create an account"
        >
          <span className="auth-tab-pill" aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={`auth-tab${mode === 'signin' ? ' auth-tab-active' : ''}`}
            onClick={() => setMode('signin')}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab${mode === 'signup' ? ' auth-tab-active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Create account
          </button>
        </div>

        {/* Keyed so the entrance animation replays when the form swaps. */}
        <div key={mode} className="auth-form-slot">
          {mode === 'signin' ? (
            <SignInForm onSwitchToSignUp={() => setMode('signup')} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setMode('signin')} />
          )}
        </div>

        {USING_MOCK_AUTH && (
          <p className="auth-mock-note">
            <strong>Mock auth is on.</strong> Accounts are stored in this browser and never leave
            it. Set <code>VITE_AUTH_MOCK=false</code> once the API is reachable.
          </p>
        )}
      </section>
    </div>
  )
}
