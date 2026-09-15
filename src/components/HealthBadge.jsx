import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../api/client.js'

const LABELS = {
  loading: 'Checking…',
  healthy: 'Connected',
  degraded: 'Degraded',
  unreachable: 'Offline',
}

function ServiceRow({ name, service }) {
  if (!service) {
    return (
      <li>
        <span className={`dot dot-unknown`} aria-hidden="true" />
        {name}: unknown
      </li>
    )
  }
  return (
    <li>
      <span className={`dot ${service.reachable ? 'dot-ok' : 'dot-bad'}`} aria-hidden="true" />
      <div>
        <strong>{name}</strong> — {service.reachable ? 'reachable' : 'unreachable'}
        {service.error && <div className="muted">{service.error}</div>}
        {service.database && <div className="muted">Database: {service.database}</div>}
        {service.vectorIndex && <div className="muted">Vector index: {service.vectorIndex}</div>}
        {service.llmModel && <div className="muted">LLM: {service.llmModel}</div>}
        {service.embeddingModel && <div className="muted">Embeddings: {service.embeddingModel}</div>}
        {Array.isArray(service.models) && service.models.length > 0 && (
          <div className="muted">Models: {service.models.join(', ')}</div>
        )}
      </div>
    </li>
  )
}

/** Header badge; hover or click reveals which service is down and the models. */
export default function HealthBadge({ health, status, error, onRefresh }) {
  // Hovering previews the details; clicking pins them open so the pointer can
  // leave (and so keyboard users get there at all). Tracking the two
  // separately keeps a click from immediately undoing the hover that
  // preceded it.
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const wrapperRef = useRef(null)
  const open = hovered || pinned

  useEffect(() => {
    if (!pinned) return undefined
    const onDocumentDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setPinned(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setPinned(false)
    }
    document.addEventListener('mousedown', onDocumentDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [pinned])

  const services = health?.services

  return (
    <div
      className="health-wrapper"
      ref={wrapperRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        className={`health-badge health-${status}`}
        aria-expanded={open}
        onClick={() => setPinned((value) => !value)}
      >
        <span className="dot" aria-hidden="true" />
        <span>{LABELS[status]}</span>
      </button>

      {open && (
        <div className="health-popover" role="status">
          <div className="health-popover-head">
            <strong>Backend</strong>
            <code>{API_BASE_URL}</code>
          </div>
          {status === 'unreachable' ? (
            <p className="muted">{error || 'The backend did not respond.'}</p>
          ) : (
            <ul className="health-services">
              <ServiceRow name="MongoDB Atlas" service={services?.mongodb} />
              <ServiceRow name="Ollama" service={services?.ollama} />
            </ul>
          )}
          <button type="button" className="btn btn-small" onClick={onRefresh}>
            Check again
          </button>
        </div>
      )}
    </div>
  )
}
