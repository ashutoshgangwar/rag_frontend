import { useState } from 'react'
import AgentHub from './AgentHub.jsx'
import AgentIcon from './AgentIcon.jsx'
import AgentPage from './AgentPage.jsx'
import { useAgents } from '../../hooks/useAgents.js'

/**
 * Everything under /agents. Owns the catalog fetch and the hub's filters, so
 * opening an agent and coming back neither refetches nor resets them.
 *
 *   /agents            → the hub
 *   /agents/:agentId   → that agent, found in the list already fetched
 */
export default function AgentsView({ route, routeState, navigate }) {
  const catalog = useAgents()
  const [group, setGroup] = useState('all')
  const [query, setQuery] = useState('')

  const openAgent = (agent, prompt = '') =>
    navigate(`/agents/${encodeURIComponent(agent.id)}`, prompt ? { prompt } : null)
  const backToHub = () => navigate('/agents')

  if (route.page === 'agent') {
    if (catalog.loading) {
      return (
        <div className="boot-screen agents-loading" role="status">
          <p className="muted">Loading agent…</p>
        </div>
      )
    }
    if (catalog.error) {
      return (
        <div className="notice notice-error" role="alert">
          <p className="notice-title">Could not load agents</p>
          <p>{catalog.error}</p>
          <div className="notice-actions">
            <button type="button" className="btn btn-small" onClick={catalog.reload}>Retry</button>
            <button type="button" className="btn btn-small" onClick={backToHub}>All agents</button>
          </div>
        </div>
      )
    }

    const agent = catalog.agents.find((item) => item.id === route.agentId)
    if (!agent) {
      return (
        <div className="empty-state agent-missing">
          <AgentIcon name="search" size={28} />
          <p className="empty-title">Agent not found</p>
          <p className="muted">There is no agent called “{route.agentId}”. It may have been removed.</p>
          <button type="button" className="btn btn-primary" onClick={backToHub}>
            See all agents
          </button>
        </div>
      )
    }

    // Keyed by agent id: moving between agents is a fresh page, not a
    // leftover conversation from the previous one.
    return (
      <AgentPage
        key={agent.id}
        agent={agent}
        prompt={typeof routeState?.prompt === 'string' ? routeState.prompt : ''}
        onBack={backToHub}
      />
    )
  }

  return (
    <AgentHub
      agents={catalog.agents}
      groups={catalog.groups}
      loading={catalog.loading}
      error={catalog.error}
      onReload={catalog.reload}
      group={group}
      onGroup={setGroup}
      query={query}
      onQuery={setQuery}
      onOpen={openAgent}
    />
  )
}
