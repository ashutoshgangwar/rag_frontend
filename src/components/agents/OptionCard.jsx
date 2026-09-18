import AgentIcon from './AgentIcon.jsx'
import { formatINR } from '../../api/agents.js'

/** One choice the agent came back with. The whole card is the button. */
export default function OptionCard({ option, index, selected, onSelect, actionLabel = 'Select' }) {
  return (
    <li className="stagger" style={{ '--i': index }}>
      <button
        type="button"
        className={`option-card ${selected ? 'option-card-selected' : ''}`}
        onClick={() => onSelect?.(option)}
        aria-pressed={selected}
      >
        <div className="option-main">
          <div className="option-head">
            <strong className="option-title">{option.title}</strong>
            {option.rating != null && (
              <span className="option-rating" title="Rating">
                <AgentIcon name="star" size={12} strokeWidth={0} className="star-fill" />
                {option.rating}
              </span>
            )}
          </div>
          <p className="muted">{option.subtitle}</p>

          {option.badges?.length > 0 && (
            <div className="option-badges">
              {option.badges.map((badge) => (
                <span key={badge} className="option-badge">{badge}</span>
              ))}
            </div>
          )}

          {option.details?.length > 0 && (
            <ul className="option-details">
              {option.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="option-side">
          {option.price != null && (
            <div className="option-price">
              <strong>{formatINR(option.price)}</strong>
              {option.priceNote && <small className="muted">{option.priceNote}</small>}
            </div>
          )}
          <span className="option-cta">
            {actionLabel}
            <AgentIcon name="arrow" size={14} />
          </span>
        </div>
      </button>
    </li>
  )
}
