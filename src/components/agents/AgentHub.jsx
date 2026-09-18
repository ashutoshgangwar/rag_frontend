import { useMemo, useState } from 'react'
import AgentCard from './AgentCard.jsx'
import AgentIcon from './AgentIcon.jsx'
import { findAgentForText, matchesSearch } from '../../agents/form.js'
import { useAuth } from '../../auth/AuthContext.js'
import { displayName } from '../../utils/validation.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The agent launcher, built only from what GET /api/agents returned. Two ways
 * in: type what you want (matched to an agent by keyword), or pick a card.
 *
 * Group and search are owned by the parent so they survive a visit to an
 * agent and back.
 */
export default function AgentHub({ agents, groups, loading, error, onReload, group, onGroup, query, onQuery, onOpen }) {
  const { user } = useAuth()
  const [ask, setAsk] = useState('')
  const [askMiss, setAskMiss] = useState(false)

  const knownGroups = useMemo(() => {
    const present = new Set(agents.map((agent) => agent.group))
    return groups.filter((g) => present.has(g.id))
  }, [agents, groups])

  const counts = useMemo(() => {
    const byGroup = { all: agents.length }
    for (const agent of agents) byGroup[agent.group] = (byGroup[agent.group] ?? 0) + 1
    return byGroup
  }, [agents])

  const visible = useMemo(
    () => agents.filter((agent) => (group === 'all' || agent.group === group) && matchesSearch(agent, query)),
    [agents, group, query],
  )

  // "All" with no search is shown in sections, one per group in the server's
  // order; agents whose group is not listed still appear, under "Other".
  const sections = useMemo(() => {
    if (group !== 'all' || query.trim()) return [{ id: 'results', label: null, items: visible }]
    const listed = new Set(knownGroups.map((g) => g.id))
    const out = knownGroups.map((g) => ({ ...g, items: visible.filter((agent) => agent.group === g.id) }))
    out.push({ id: '__other', label: 'Other', items: visible.filter((agent) => !listed.has(agent.group)) })
    return out.filter((section) => section.items.length > 0)
  }, [group, query, visible, knownGroups])

  // Starters come from the agents' own examples, one each from the first few.
  const starters = useMemo(
    () =>
      agents
        .map((agent) => (Array.isArray(agent.examples) ? agent.examples[0] : null))
        .filter((text) => typeof text === 'string' && text)
        .slice(0, 4),
    [agents],
  )

  const submitAsk = (text) => {
    const value = text.trim()
    if (!value) return
    const match = findAgentForText(agents, value)
    if (match) {
      setAskMiss(false)
      setAsk('')
      onOpen(match, value)
    } else {
      setAskMiss(true)
    }
  }

  // Starters are an agent's own example, so they go straight to that agent.
  const openStarter = (text) => {
    const owner = agents.find((agent) => Array.isArray(agent.examples) && agent.examples.includes(text))
    if (owner) onOpen(owner, text)
  }

  const ready = !loading && !error

  return (
    <div className="agent-hub">
      <section className="hub-hero">
        {ready && agents.length > 0 && (
          <span className="hub-eyebrow">
            <AgentIcon name="spark" size={14} />
            {agents.length} AI {agents.length === 1 ? 'agent' : 'agents'}
          </span>
        )}
        <h2 className="hub-title">
          {greeting()}, {displayName(user).split(' ')[0]}.{' '}
          <span className="gradient-text">What should your agent write?</span>
        </h2>
        <p className="muted hub-sub">
          Answers, explanations, drafts and plans — written by a model running on your own server. Agents
          only write text; they never send, book or buy anything.
        </p>

        <form
          className="hub-ask"
          onSubmit={(event) => {
            event.preventDefault()
            submitAsk(ask)
          }}
        >
          <AgentIcon name="spark" size={20} className="hub-ask-icon" />
          <label className="sr-only" htmlFor="hub-ask">
            Describe what you need
          </label>
          <input
            id="hub-ask"
            value={ask}
            onChange={(event) => {
              setAsk(event.target.value)
              setAskMiss(false)
            }}
            placeholder="e.g. Write an email asking for a deadline extension"
            autoComplete="off"
            disabled={!ready || agents.length === 0}
          />
          <button type="submit" className="btn btn-primary btn-glow" disabled={!ask.trim() || !ready}>
            Go
            <AgentIcon name="arrow" size={16} />
          </button>
        </form>

        {askMiss ? (
          <p className="hub-hint" role="status">
            No agent clearly matches that. Pick one below, or search for a topic.
          </p>
        ) : (
          starters.length > 0 && (
            <div className="hub-quick">
              {starters.map((text) => (
                <button key={text} type="button" className="chip" onClick={() => openStarter(text)}>
                  {text}
                </button>
              ))}
            </div>
          )
        )}
      </section>

      {ready && agents.length > 0 && (
        <div className="hub-toolbar">
          <div className="hub-groups" role="tablist" aria-label="Agent groups">
            {[{ id: 'all', label: 'All' }, ...knownGroups].map((g) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={group === g.id}
                className={`group-chip ${group === g.id ? 'group-chip-active' : ''}`}
                onClick={() => onGroup(g.id)}
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
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Search agents"
            />
          </label>
        </div>
      )}

      {loading && (
        <ul className="agent-grid" aria-busy="true" aria-label="Loading agents">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="agent-tile-skeleton" />
          ))}
        </ul>
      )}

      {error && !loading && (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Could not load agents</p>
          <p>{error}</p>
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={onReload}>
              Retry
            </button>
          </div>
        </div>
      )}

      {ready && agents.length === 0 && (
        <div className="empty-state hub-empty">
          <p className="empty-title">No agents available yet</p>
          <p className="muted">Agents added on the server will show up here.</p>
        </div>
      )}

      {ready && agents.length > 0 && visible.length === 0 && (
        <div className="empty-state hub-empty">
          <p className="empty-title">No agent matches “{query.trim()}”</p>
          <button type="button" className="btn btn-link" onClick={() => onQuery('')}>
            Clear search
          </button>
        </div>
      )}

      {ready &&
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
                <AgentCard key={agent.id} agent={agent} index={index} onOpen={() => onOpen(agent)} />
              ))}
            </ul>
          </section>
        ))}
    </div>
  )
}
