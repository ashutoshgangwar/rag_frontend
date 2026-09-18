/**
 * Parses the markdown subset the backend normalises agent answers to:
 *   "## " headings, "- " bullets, "1. " numbered lists, blank-line
 *   paragraphs, and ``` fenced code blocks with an optional language.
 *
 * Returns plain data; AnswerText turns it into React text nodes, so nothing
 * the model writes is ever treated as HTML. Other heading levels and "* "
 * bullets are accepted too, in case one slips through the server's normaliser.
 */

const FENCE = /^\s*```\s*([\w+#.-]*)\s*$/
const HEADING = /^#{1,6}\s+(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*(\d+)[.)]\s+(.*)$/

export function parseAnswer(text) {
  const blocks = []
  const lines = String(text ?? '').replace(/\r\n?/g, '\n').split('\n')
  let paragraph = null
  let list = null

  const flush = () => {
    if (paragraph) blocks.push({ type: 'p', lines: paragraph })
    if (list) blocks.push(list)
    paragraph = null
    list = null
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]
    const fence = line.match(FENCE)
    if (fence) {
      flush()
      const code = []
      i += 1
      while (i < lines.length && !FENCE.test(lines[i])) {
        code.push(lines[i])
        i += 1
      }
      // An unclosed fence still renders as code rather than swallowing nothing.
      blocks.push({ type: 'code', lang: fence[1] || '', code: code.join('\n') })
      continue
    }

    if (!line.trim()) {
      flush()
      continue
    }

    const heading = line.match(HEADING)
    if (heading) {
      flush()
      blocks.push({ type: 'h', text: heading[1] })
      continue
    }

    const bullet = line.match(BULLET)
    const numbered = !bullet && line.match(NUMBERED)
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      if (paragraph) {
        blocks.push({ type: 'p', lines: paragraph })
        paragraph = null
      }
      if (list?.type !== type) {
        if (list) blocks.push(list)
        list = { type, start: numbered ? Number(numbered[1]) : 1, items: [] }
      }
      list.items.push(bullet ? bullet[1] : numbered[2])
      continue
    }

    // A plain line right under a list item continues that item.
    if (list) {
      list.items[list.items.length - 1] += ` ${line.trim()}`
      continue
    }
    paragraph = paragraph ? [...paragraph, line] : [line]
  }
  flush()
  return blocks
}
