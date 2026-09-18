import AgentIcon from './AgentIcon.jsx'

const MODE_LABEL = {
  options: 'Finds & books',
  answer: 'Answers & drafts',
}

/** One agent tile in the hub grid. `hue` tints the whole card via --tint. */
export default function AgentCard({ agent, index = 0, onOpen }) {
  return (
    <li className="stagger" style={{ '--i': Math.min(index, 12) }}>
      <button
        type="button"
        className="agent-tile"
        style={{ '--tint': agent.hue }}
        onClick={() => onOpen(agent)}
      >
        <span className="agent-tile-glow" aria-hidden="true" />
        <span className="agent-orb" aria-hidden="true">
          <AgentIcon name={agent.icon} size={22} />
        </span>
        <span className="agent-tile-body">
          <strong className="agent-tile-name">{agent.name}</strong>
          <span className="agent-tile-tagline">{agent.tagline}</span>
        </span>
        <span className="agent-tile-foot">
          <span className="agent-tile-mode">{MODE_LABEL[agent.mode] ?? 'Agent'}</span>
          <span className="agent-tile-go" aria-hidden="true">
            <AgentIcon name="arrow" size={15} />
          </span>
        </span>
      </button>
    </li>
  )
}
