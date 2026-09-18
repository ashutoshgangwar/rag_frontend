export const LIMITS = { text: 300, textarea: 6000, total: 12000, question: 1000 }

const KNOWN_TYPES = new Set(['select', 'text', 'textarea', 'number'])

/** The type actually rendered: anything unknown (or a select without options) is text. */
export function fieldType(field) {
  if (field.type === 'select' && !(Array.isArray(field.options) && field.options.length)) return 'text'
  return KNOWN_TYPES.has(field.type) ? field.type : 'text'
}

export function fieldsOf(agent) {
  return Array.isArray(agent?.fields) ? agent.fields.filter((field) => field && field.name) : []
}

/** Where an example chip (or text typed in the hub) goes: the first required textarea. */
export function promptField(agent) {
  const fields = fieldsOf(agent)
  return (
    fields.find((field) => fieldType(field) === 'textarea' && field.required) ??
    fields.find((field) => fieldType(field) === 'textarea') ??
    null
  )
}

/** Selects start on their first option, numbers on their default, the rest empty. */
export function initialValues(agent, prompt = '') {
  const values = {}
  for (const field of fieldsOf(agent)) {
    const type = fieldType(field)
    if (type === 'select') values[field.name] = field.options[0]
    else if (type === 'number' && field.default != null) values[field.name] = String(field.default)
    else values[field.name] = ''
  }
  const target = promptField(agent)
  if (prompt && target) values[target.name] = prompt
  return values
}

function checkField(field, raw) {
  const label = field.label || field.name
  const type = fieldType(field)
  const value = String(raw ?? '').trim()

  if (value === '') return field.required ? { error: `${label} is required.` } : {}

  if (type === 'select') {
    return field.options.includes(value)
      ? { value }
      : { error: `${label} must be one of: ${field.options.join(', ')}.` }
  }
  if (type === 'number') {
    const number = Number(value)
    if (!Number.isFinite(number)) return { error: `${label} must be a number.` }
    if (field.min != null && number < field.min) return { error: `${label} must be at least ${field.min}.` }
    if (field.max != null && number > field.max) return { error: `${label} must be at most ${field.max}.` }
    return { value: number }
  }
  const limit = type === 'textarea' ? LIMITS.textarea : LIMITS.text
  if (value.length > limit) return { error: `${label} is too long (max ${limit} characters).` }
  return { value }
}

/**
 * Validate and clean in one pass.
 * @returns {{ input: object, fields: Record<string,string>, error: string|null }}
 *   `input` is the payload to send: trimmed, numbers as numbers, empty
 *   optional fields dropped. `error` is the first problem, for the top of the form.
 */
export function validateValues(agent, values) {
  const input = {}
  const fields = {}
  for (const field of fieldsOf(agent)) {
    const { value, error } = checkField(field, values[field.name])
    if (error) fields[field.name] = error
    else if (value !== undefined) input[field.name] = value
  }

  const first = Object.values(fields)[0]
  if (first) return { input, fields, error: first }

  const total = Object.values(input).reduce((sum, value) => sum + String(value).length, 0)
  if (total > LIMITS.total) {
    const longest = Object.keys(input).reduce((a, b) =>
      String(input[a]).length >= String(input[b]).length ? a : b,
    )
    const message = `Your input is too long (max ${LIMITS.total} characters in total).`
    return { input, fields: { [longest]: message }, error: message }
  }

  return { input, fields: {}, error: null }
}

/**
 * Best agent for free text typed into the hub, by keyword. A longer keyword
 * scores higher, so a specific match beats a generic one. Null when nothing hits.
 */
export function findAgentForText(agents, text) {
  const query = text.toLowerCase()
  let best = null
  let bestScore = 0
  for (const agent of agents) {
    let score = 0
    for (const keyword of Array.isArray(agent.keywords) ? agent.keywords : []) {
      const word = String(keyword).toLowerCase()
      if (word && query.includes(word)) score += 2 + word.length / 10
    }
    if (agent.name && query.includes(String(agent.name).toLowerCase())) score += 1
    if (score > bestScore) {
      best = agent
      bestScore = score
    }
  }
  return best
}

/** Case-insensitive match on name, tagline and keywords. */
export function matchesSearch(agent, query) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return [agent.name, agent.tagline, ...(Array.isArray(agent.keywords) ? agent.keywords : [])].some(
    (text) => typeof text === 'string' && text.toLowerCase().includes(needle),
  )
}

/** `hue` goes into CSS, so only a hex colour is trusted; anything else falls back. */
export function accentOf(agent) {
  return typeof agent?.hue === 'string' && /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(agent.hue)
    ? agent.hue
    : 'var(--accent)'
}
