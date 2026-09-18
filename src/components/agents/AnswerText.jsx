import CopyButton from './CopyButton.jsx'
import { parseAnswer } from '../../agents/answer.js'

/**
 * Renders exactly the markdown subset the backend normalises answers to:
 *   "## " headings, "- " bullets, "1. " numbered lists, blank-line
 *   paragraphs, and ``` fenced code blocks with an optional language.
 *
 * Everything becomes React text nodes — nothing is ever set as HTML — so
 * whatever the model writes is escaped. Parsing lives in agents/answer.js.
 *
 * `allowCode={false}` drops fenced code blocks: a small model sometimes
 * answers a travel or gift question with a JavaScript snippet, and for an
 * agent that is not about code that is never what the user wanted.
 */

export default function AnswerText({ text, allowCode = true }) {
  const blocks = parseAnswer(text).filter((block) => allowCode || block.type !== 'code')
  return (
    <div className="answer-text">
      {blocks.map((block, index) => {
        switch (block.type) {
          case 'h':
            return <h4 key={index}>{block.text}</h4>
          case 'p':
            return (
              <p key={index}>
                {block.lines.map((line, lineIndex) => (
                  <span key={lineIndex}>
                    {lineIndex > 0 && <br />}
                    {line}
                  </span>
                ))}
              </p>
            )
          case 'code':
            return (
              <div key={index} className="code-block">
                <div className="code-head">
                  <span>{block.lang || 'code'}</span>
                  <CopyButton text={block.code} />
                </div>
                <pre>
                  <code>{block.code}</code>
                </pre>
              </div>
            )
          case 'ol':
            return (
              <ol key={index} start={block.start}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ol>
            )
          default:
            return (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{item}</li>
                ))}
              </ul>
            )
        }
      })}
    </div>
  )
}
