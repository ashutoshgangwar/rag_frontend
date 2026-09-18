import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext.js'
import { displayName, initials } from '../utils/validation.js'
import ThemeToggle from './ThemeToggle.jsx'

/**
 * The signed-in avatar in the header. Click opens; Escape or a click outside
 * closes — the same pattern as HealthBadge next to it, minus the hover, since
 * sign-out is not something to put a hair trigger on.
 */
export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDocumentDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocumentDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  if (!user) return null

  const handleSignOut = async () => {
    setBusy(true)
    try {
      await signOut()
      // The screen swaps under us on success, so there is no state to restore.
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="user-menu" ref={wrapperRef}>
      <button
        type="button"
        className="user-button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="avatar" aria-hidden="true">
          {initials(user)}
        </span>
        <span className="user-button-name">{displayName(user)}</span>
      </button>

      {open && (
        <div className="user-popover" role="menu">
          <div className="user-popover-head">
            <span className="avatar avatar-large" aria-hidden="true">
              {initials(user)}
            </span>
            <div className="user-identity">
              <strong>{displayName(user)}</strong>
              {user.email && <span className="muted">{user.email}</span>}
              {/* Only shown when the account actually carries it — a stale
                  session from before these fields existed will not. */}
              {user.companyName && (
                <small className="user-org">
                  {user.designation ? `${user.designation} · ` : ''}
                  {user.companyName}
                </small>
              )}
            </div>
          </div>

          {/* Repeated here because the header copy is hidden on narrow screens. */}
          <div className="user-popover-row">
            <span className="muted">Theme</span>
            <ThemeToggle />
          </div>

          <button
            type="button"
            className="btn btn-small btn-block"
            role="menuitem"
            onClick={handleSignOut}
            disabled={busy}
          >
            {busy ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
