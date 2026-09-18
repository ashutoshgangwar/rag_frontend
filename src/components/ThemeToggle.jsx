import { useTheme } from '../theme/theme.js'

const ICONS = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </>
  ),
  dark: <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />,
}

const OPTIONS = [
  { id: 'light', label: 'Light' },
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
]

/**
 * Three-way switch: light, follow the OS, or dark. A radio group rather than a
 * single cycling button, so the current choice is visible without clicking.
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, setTheme } = useTheme()

  return (
    <div className={`theme-toggle ${className}`} role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={theme === option.id}
          className={`theme-option ${theme === option.id ? 'theme-option-active' : ''}`}
          onClick={() => setTheme(option.id)}
          title={`${option.label} theme`}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {ICONS[option.id]}
          </svg>
          <span className="sr-only">{option.label}</span>
        </button>
      ))}
    </div>
  )
}
