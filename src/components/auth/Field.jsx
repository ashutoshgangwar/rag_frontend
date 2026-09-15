import { useId, useState } from 'react'

/**
 * One labelled control for the auth forms — text, email, tel, password, or a
 * select — with its error wired up through aria-describedby so a screen reader
 * announces it with the field instead of leaving it as loose text.
 *
 * The whole control is one focus-tinted shell: the icon, the border and the
 * glow all key off `:focus-within`, so there is exactly one place the eye has
 * to be at any moment.
 *
 * A password field gets a reveal toggle. Typing a password blind is the single
 * biggest cause of a "wrong password" that was not.
 */
export default function Field({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  error = null,
  hint = null,
  icon = null,
  adornment = null,
  options = null,
  suggestions = null,
  placeholder,
  autoComplete,
  inputMode,
  disabled = false,
  autoFocus = false,
  children,
}) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)

  const isPassword = type === 'password'
  const isSelect = Array.isArray(options)
  const listId = suggestions ? `${id}-list` : undefined
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  const shared = {
    id,
    value,
    onBlur,
    disabled,
    autoFocus,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    onChange: (event) => onChange(event.target.value),
  }

  return (
    <div className={`field${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>

      <div className={`field-control${icon ? ' field-has-icon' : ''}`}>
        {icon && (
          <span className="field-icon" aria-hidden="true">
            {icon}
          </span>
        )}

        {isSelect ? (
          <select {...shared} className="field-select">
            <option value="" disabled>
              {placeholder || 'Select…'}
            </option>
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : (
          <input
            {...shared}
            type={isPassword && revealed ? 'text' : type}
            list={listId}
            placeholder={placeholder}
            autoComplete={autoComplete}
            inputMode={inputMode}
          />
        )}

        {suggestions && (
          <datalist id={listId}>
            {suggestions.map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        )}

        {adornment && <span className="field-adornment">{adornment}</span>}

        {isPassword && (
          <button
            type="button"
            className="field-reveal"
            onClick={() => setRevealed((shown) => !shown)}
            // A convenience, never a tab stop between the password and Submit.
            tabIndex={-1}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            disabled={disabled}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}

        <span className="field-glow" aria-hidden="true" />
      </div>

      {children}

      {error ? (
        <p className="field-error" id={errorId}>
          {error}
        </p>
      ) : (
        hint && (
          <p className="field-hint" id={hintId}>
            {hint}
          </p>
        )
      )}
    </div>
  )
}
