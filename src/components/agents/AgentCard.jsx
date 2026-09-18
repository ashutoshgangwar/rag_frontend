import AgentIcon from './AgentIcon.jsx'
import { accentOf } from '../../agents/form.js'

/** One agent tile in the hub grid. The agent's `hue` tints it via --tint. */
export default function AgentCard({ agent, index = 0, onOpen }) {
  return (
    <li className="stagger" style={{ '--i': Math.min(index, 12) }}>
      <button type="button" className="agent-tile" style={{ '--tint': accentOf(agent) }} onClick={onOpen}>
        <span className="agent-tile-glow" aria-hidden="true" />
        <span className="agent-orb" aria-hidden="true">
          <AgentIcon name={agent.icon} size={22} />
        </span>
        <span className="agent-tile-body">
          <strong className="agent-tile-name">{agent.name}</strong>
          {agent.tagline && <span className="agent-tile-tagline">{agent.tagline}</span>}
        </span>
        <span className="agent-tile-foot">
          {agent.cta && <span className="agent-tile-mode">{agent.cta}</span>}
          <span className="agent-tile-go" aria-hidden="true">
            <AgentIcon name="arrow" size={15} />
          </span>
        </span>
      </button>
    </li>
  )
}
