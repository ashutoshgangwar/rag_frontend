import { useEffect, useRef, useState } from 'react'

/**
 * Minimal modal confirmation. Focus moves to the cancel button on open (the
 * safe choice), Escape dismisses, and focus returns to whatever opened it.
 *
 * `requireText` raises the bar for the genuinely irreversible actions: the
 * confirm button stays disabled until that exact word is typed.
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  requireText = null,
  onConfirm,
  onCancel,
}) {
  const cancelRef = useRef(null)
  const restoreFocusRef = useRef(null)
  const [typed, setTyped] = useState('')
  const [wasOpen, setWasOpen] = useState(open)

  // The dialog keeps its state while closed, so a typed confirmation is
  // cleared as it reopens rather than lingering from the previous time.
  if (wasOpen !== open) {
    setWasOpen(open)
    if (typed !== '') setTyped('')
  }

  useEffect(() => {
    if (!open) return undefined

    restoreFocusRef.current = document.activeElement
    cancelRef.current?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (restoreFocusRef.current instanceof HTMLElement) restoreFocusRef.current.focus()
    }
  }, [open, onCancel])

  if (!open) return null

  const confirmBlocked = Boolean(requireText) && typed.trim() !== requireText

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-description">{description}</p>

        {requireText && (
          <div className="dialog-confirm-input">
            <label htmlFor="confirm-phrase">
              Type <strong>{requireText}</strong> to confirm
            </label>
            <input
              id="confirm-phrase"
              type="text"
              value={typed}
              autoComplete="off"
              onChange={(event) => setTyped(event.target.value)}
              disabled={busy}
            />
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" ref={cancelRef} onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={busy || confirmBlocked}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
