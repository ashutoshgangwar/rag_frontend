import { useMemo, useState } from 'react'
import AgentCard from './AgentCard.jsx'
import AgentIcon from './AgentIcon.jsx'
import AgentSession from './AgentSession.jsx'
import { GROUPS, routeRequest } from '../../agents/catalog.js'
import { IS_DEMO } from '../../api/agents.js'
import { useAgents } from '../../hooks/useAgents.js'
import { useAuth } from '../../auth/AuthContext.js'
import { displayName } from '../../utils/validation.js'

const QUICK_ASKS = [
  'Book a hotel in Goa for next weekend',
  'Order biryani for dinner',
  'Explain Newton’s laws simply',
  'Write an email asking for leave',
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The agent launcher. Two ways in: type what you want (routed to the best
 * agent by keyword), or pick an agent from the grid. Either way the grid is
 * swapped for that agent's session; Back returns here with filters intact.
 */
export default function AgentHub() {
  const { user } = useAuth()
  const { agents, loading, error, reload } = useAgents()
  const [group, setGroup] = useState('all')
  const [query, setQuery] = useState('')
  const [ask, setAsk] = useState('')
  const [askMiss, setAskMiss] = useState(false)
  // `session` carries a key so "New request" can remount a fresh run.
  const [session, setSession] = useState(null)

  const counts = useMemo(() => {
    const byGroup = { all: agents.length }
    for (const agent of agents) byGroup[agent.group] = (byGroup[agent.group] ?? 0) + 1
    return byGroup
  }, [agents])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return agents.filter((agent) => {
      if (group !== 'all' && agent.group !== group) return false
      if (!needle) return true
      return [agent.name, agent.tagline, ...(agent.keywords ?? [])].some((text) =>
        text.toLowerCase().includes(needle),
      )
    })
  }, [agents, group, query])

  const sections = useMemo(() => {
    if (group !== 'all' || query.trim()) return [{ id: 'results', label: null, items: visible }]
    return GROUPS.map((g) => ({ ...g, items: visible.filter((agent) => agent.group === g.id) })).filter(
      (section) => section.items.length > 0,
    )
  }, [group, query, visible])

  const open = (agent, request = '') => {
    setSession({ agent, request, key: Date.now() })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitAsk = (text) => {
    const value = text.trim()
    if (!value) return
    const match = routeRequest(value)
    if (match) {
      setAskMiss(false)
      setAsk('')
      open(match, value)
    } else {
      // No confident match: narrow the grid with what they typed instead.
      setAskMiss(true)
      setGroup('all')
      setQuery(value.split(/\s+/).slice(0, 2).join(' '))
    }
  }

  if (session) {
    return (
      <AgentSession
        key={session.key}
        agent={session.agent}
        request={session.request}
        onBack={() => setSession(null)}
        onRestart={() => open(session.agent)}
      />
    )
  }

  return (
    <div className="agent-hub">
      <section className="hub-hero">
        <span className="hub-eyebrow">
          <AgentIcon name="spark" size={14} />
          {agents.length || 25} AI agents{IS_DEMO && ' · demo mode'}
        </span>
        <h2 className="hub-title">
          {greeting()}, {displayName(user).split(' ')[0]}.{' '}
          <span className="gradient-text">What should your agent do?</span>
        </h2>
        <p className="muted hub-sub">
          Describe it in your own words, or pick an agent below. It plans the steps, finds options and
          handles the booking.
        </p>

        <form
          className="hub-ask"
          onSubmit={(event) => {
            event.preventDefault()
            submitAsk(ask)
          }}
        >
          <AgentIcon name="spark" size={20} className="hub-ask-icon" />
          <label className="sr-only" htmlFor="hub-ask">Tell the agents what you need</label>
          <input
            id="hub-ask"
            value={ask}
            onChange={(event) => {
              setAsk(event.target.value)
              setAskMiss(false)
            }}
            placeholder="e.g. Book a table for 4 tonight in Bandra"
            autoComplete="off"
          />
          <button type="submit" className="btn btn-primary btn-glow" disabled={!ask.trim()}>
            Go
            <AgentIcon name="arrow" size={16} />
          </button>
        </form>

        {askMiss ? (
          <p className="hub-hint" role="status">
            Not sure which agent fits that — here are the closest ones. Pick one to continue.
          </p>
        ) : (
          <div className="hub-quick">
            {QUICK_ASKS.map((text) => (
              <button key={text} type="button" className="chip" onClick={() => submitAsk(text)}>
                {text}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="hub-toolbar">
        <div className="hub-groups" role="tablist" aria-label="Agent categories">
          {[{ id: 'all', label: 'All' }, ...GROUPS].map((g) => (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={group === g.id}
              className={`group-chip ${group === g.id ? 'group-chip-active' : ''}`}
              onClick={() => setGroup(g.id)}
            >
              {g.label}
              <span className="group-count">{counts[g.id] ?? 0}</span>
            </button>
          ))}
        </div>

        <label className="hub-search">
          <AgentIcon name="search" size={16} />
          <span className="sr-only">Search agents</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search agents"
          />
        </label>
      </div>

      {loading && (
        <ul className="agent-grid" aria-busy="true" aria-label="Loading agents">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className="agent-tile-skeleton" />
          ))}
        </ul>
      )}

      {error && !loading && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Could not load agents</p>
          <p>{error}</p>
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={reload}>Retry</button>
          </div>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <div className="empty-state hub-empty">
          <p className="empty-title">No agent matches “{query}”</p>
          <button type="button" className="btn btn-link" onClick={() => setQuery('')}>
            Clear search
          </button>
        </div>
      )}

      {!loading &&
        !error &&
        sections.map((section) => (
          <section key={section.id} className="hub-section">
            {section.label && (
              <h3 className="hub-section-title">
                {section.label}
                <span className="muted">{section.items.length}</span>
              </h3>
            )}
            <ul className="agent-grid">
              {section.items.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} index={index} onOpen={(a) => open(a)} />
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
