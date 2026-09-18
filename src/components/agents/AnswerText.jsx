/**
 * Renders the agent's light-structure text (see src/api/agents.js):
 * "## " headings, "- " bullets, "1. " numbered steps, blank-line paragraphs.
 * Built as React nodes, never as HTML, so agent text can't inject markup.
 */
export default function AnswerText({ text }) {
  const blocks = []
  let list = null

  const flush = () => {
    if (list) blocks.push(list)
    list = null
  }

  for (const raw of String(text ?? '').split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^- (.*)$/)
    const numbered = line.match(/^\d+\. (.*)$/)

    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      if (list?.type !== type) {
        flush()
        list = { type, items: [] }
      }
      list.items.push((bullet ?? numbered)[1])
      continue
    }

    flush()
    if (line.startsWith('## ')) blocks.push({ type: 'h', text: line.slice(3) })
    else if (line.trim()) blocks.push({ type: 'p', text: line })
    else blocks.push({ type: 'gap' })
  }
  flush()

  return (
    <div className="answer-text">
      {blocks.map((block, index) => {
        if (block.type === 'h') return <h4 key={index}>{block.text}</h4>
        if (block.type === 'p') return <p key={index}>{block.text}</p>
        if (block.type === 'gap') return <span key={index} className="answer-gap" />
        const List = block.type
        return (
          <List key={index}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{item}</li>
            ))}
          </List>
        )
      })}
    </div>
  )
}
