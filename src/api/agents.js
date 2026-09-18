/**
 * The agent service. The UI only ever talks to the three functions exported
 * here, so wiring the real backend means replacing their bodies — nothing in
 * components/ or hooks/ has to change.
 *
 * Every call takes `{ onStep, signal }`:
 *   - onStep(label)  the agent's live progress; the backend can stream these
 *                    (SSE / websocket) and forward each one here.
 *   - signal         an AbortSignal; the UI aborts when the user cancels or
 *                    leaves the agent.
 *
 * Result shapes the UI expects:
 *   runAgent    → { kind: 'options', options: Option[], note? }
 *               | { kind: 'answer', text }
 *   confirmAgent → { reference, message, details: [label, value][] }
 *   followUp    → { text }
 *
 *   Option = { id, title, subtitle, price?, priceNote?, rating?, badges?, details? }
 *
 * `text` is plain text with light structure: lines starting with "## " are
 * headings, "- " are bullets, "1. " are numbered steps.
 *
 * Until the backend exists, everything below is simulated.
 */

import { AGENTS } from '../agents/catalog.js'

export const IS_DEMO = true

// ---------- public API ----------

/**
 * The agent list. Today it is the local catalog; later swap the body for
 * `request('/api/agents')` — the backend returns the same shape as AGENTS in
 * src/agents/catalog.js, so adding a category becomes a backend-only change.
 */
export async function fetchAgents({ signal } = {}) {
  await wait(200, signal)
  return AGENTS
}

export async function runAgent(agent, input, { onStep, signal } = {}) {
  await playSteps(stepsFor(agent, input), onStep, signal)
  if (agent.mode === 'answer') return { kind: 'answer', text: answerFor(agent, input) }
  return { kind: 'options', options: optionsFor(agent, input), note: noteFor(agent, input) }
}

export async function confirmAgent(agent, input, option, { onStep, signal } = {}) {
  await playSteps(
    ['Re-checking price and availability', 'Securing your selection', 'Generating confirmation'],
    onStep,
    signal,
  )
  const reference = `${agent.id.slice(0, 3).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  return {
    reference,
    message: confirmationMessage(agent),
    details: [
      ['Selected', option.title],
      option.price != null && ['Amount', `${formatINR(option.price)}${option.priceNote ? ` ${option.priceNote}` : ''}`],
      ...summariseInput(agent, input).slice(0, 3),
    ].filter(Boolean),
  }
}

export async function followUp(agent, input, question, { onStep, signal } = {}) {
  await playSteps(['Reading the conversation', 'Working on it'], onStep, signal)
  return {
    text: [
      `Good question. Building on what we covered about ${topicOf(agent, input)}:`,
      '',
      `- On "${truncate(question, 80)}", the short answer is: it depends mostly on your goal and constraints.`,
      '- If you share one or two more details, I can make this specific to you.',
      '- I can also turn this into a checklist or a table if that helps.',
    ].join('\n'),
  }
}

// ---------- simulation helpers ----------

async function playSteps(steps, onStep, signal) {
  for (const step of steps) {
    onStep?.(step)
    await wait(650 + Math.random() * 650, signal)
  }
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(abortError())
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(abortError())
      },
      { once: true },
    )
  })
}

function abortError() {
  return new DOMException('The agent run was cancelled.', 'AbortError')
}

export function formatINR(value) {
  return `₹${Math.round(value).toLocaleString('en-IN')}`
}

function truncate(text, n) {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text
}

function pick(input, key, fallback) {
  const value = String(input[key] ?? '').trim()
  return value || fallback
}

function summariseInput(agent, input) {
  return agent.fields
    .filter((field) => field.name !== 'request' && String(input[field.name] ?? '').trim())
    .map((field) => [field.label, String(input[field.name])])
}

function topicOf(agent, input) {
  return truncate(pick(input, 'request', agent.name.toLowerCase()), 60)
}

// ---------- per-agent simulated content ----------

function stepsFor(agent, input) {
  const place = pick(input, 'city', pick(input, 'to', 'your area'))
  const product = pick(input, 'product', 'that product')
  const byAgent = {
    hotel: [`Searching stays in ${place}`, 'Checking room availability for your dates', 'Comparing prices and reviews', 'Shortlisting the best matches'],
    flight: [`Searching flights ${pick(input, 'from', '')} → ${place}`, 'Comparing fares across airlines', 'Checking baggage and layovers', 'Ranking by price and duration'],
    train: ['Checking train and bus routes', 'Fetching live seat availability', 'Comparing travel times', 'Picking the best options'],
    cab: ['Estimating route and traffic', 'Checking nearby drivers', 'Comparing fares', 'Holding the best quotes'],
    restaurant: [`Finding restaurants in ${place}`, 'Checking tables for your time', 'Reading recent reviews', 'Shortlisting'],
    food: [`Finding places serving ${pick(input, 'craving', 'your order')}`, 'Checking delivery time to your address', 'Applying available offers', 'Shortlisting'],
    grocery: ['Reading your list', 'Matching items across stores', 'Finding the best basket price', 'Checking delivery slots'],
    amazon: [`Searching Amazon for ${product}`, 'Filtering by ratings and budget', 'Checking delivery dates', 'Shortlisting'],
    flipkart: [`Searching Flipkart for ${product}`, 'Applying bank and exchange offers', 'Checking delivery dates', 'Shortlisting'],
    compare: [`Looking up ${product} across stores`, 'Adding shipping, cashback and fees', 'Computing the real final price', 'Ranking stores'],
    gift: ['Understanding who it is for', 'Browsing gift ideas', 'Checking delivery by your date', 'Shortlisting'],
    meeting: ['Reading attendee calendars', 'Finding shared free time', 'Avoiding lunch and late hours', 'Ranking slots'],
    events: [`Finding shows in ${place}`, 'Checking seat availability', 'Comparing venues and prices', 'Shortlisting'],
    doctor: ['Matching the right specialist', 'Checking doctor availability', 'Reading patient reviews', 'Shortlisting'],
    bills: ['Identifying your provider', 'Fetching your bill and plans', 'Checking cashback offers', 'Preparing options'],
    home: ['Finding verified pros near you', 'Checking slot availability', 'Comparing ratings and prices', 'Shortlisting'],
  }
  return (
    byAgent[agent.id] ?? ['Understanding your request', 'Researching', 'Organising the answer', 'Writing it up']
  )
}

function noteFor(agent, input) {
  const notes = {
    hotel: `Prices are per night for ${pick(input, 'guests', 2)} guests, taxes included.`,
    flight: 'Fares are per passenger and include taxes.',
    compare: 'Final price includes shipping and instant discounts.',
    meeting: 'All attendees are free in these slots.',
  }
  return notes[agent.id]
}

function confirmationMessage(agent) {
  const byMode = {
    hotel: 'Your stay is booked. The hotel has your details.',
    flight: 'Your flight is booked. E-ticket details are below.',
    train: 'Your seats are booked. Keep the reference handy for boarding.',
    cab: 'Your ride is booked. Driver details arrive 15 minutes before pickup.',
    restaurant: 'Your table is reserved. The restaurant will hold it for 15 minutes.',
    meeting: 'Invites are on their way to all attendees.',
    doctor: 'Your appointment is booked. You will get a reminder an hour before.',
    bills: 'Payment successful.',
    home: 'Your service is booked. The professional will call before arriving.',
    events: 'Your tickets are booked. Show the reference at the venue.',
  }
  return byMode[agent.id] ?? 'Your order is placed. Tracking details will follow.'
}

function optionsFor(agent, input) {
  const place = pick(input, 'city', 'the city')
  const product = pick(input, 'product', 'Product')
  const from = pick(input, 'from', 'Origin')
  const to = pick(input, 'to', 'Destination')

  const catalog = {
    hotel: [
      o('The Coral Bay Resort', `Beachfront · ${place}`, 6450, '/ night', 4.6, ['Free breakfast', 'Pool'], ['Free cancellation until 24h before', 'Sea-view deluxe room']),
      o('Urban Nest Suites', `City centre · ${place}`, 3890, '/ night', 4.3, ['Best value'], ['Pay at hotel', '2 km from station']),
      o('Grand Palm Heritage', `Old town · ${place}`, 9200, '/ night', 4.8, ['Top rated', 'Spa'], ['Breakfast + dinner', 'Airport pickup included']),
    ],
    flight: [
      o('IndiGo 6E-2134', `${from} 06:10 → ${to} 08:55 · Non-stop`, 5420, '', 4.2, ['Cheapest'], ['15 kg check-in', '2h 45m']),
      o('Air India AI-503', `${from} 09:30 → ${to} 12:20 · Non-stop`, 6890, '', 4.4, ['Meal included'], ['25 kg check-in', '2h 50m']),
      o('Vistara UK-817', `${from} 18:45 → ${to} 21:35 · Non-stop`, 7310, '', 4.7, ['Fastest', 'Top rated'], ['20 kg check-in', '2h 50m']),
    ],
    train: [
      o('Deccan Queen 12124', `${from} 07:15 → ${to} 10:25 · Chair car`, 485, '/ seat', 4.5, ['Available: 42'], ['3h 10m', 'Pantry']),
      o('Shivneri AC Bus', `${from} 08:00 → ${to} 11:30 · Volvo AC`, 540, '/ seat', 4.2, ['Window seats'], ['3h 30m', 'Live tracking']),
      o('Intercity Exp 12127', `${from} 17:40 → ${to} 21:05 · 2S`, 190, '/ seat', 4.0, ['Cheapest'], ['3h 25m', 'Available: 110']),
    ],
    cab: [
      o('Mini · Swift Dzire', 'Arrives in 4 min', 420, '', 4.6, ['Cheapest'], ['4 seats', 'AC']),
      o('Sedan · Honda City', 'Arrives in 6 min', 560, '', 4.8, ['Top rated driver'], ['4 seats', 'Extra boot space']),
      o('SUV · Innova Crysta', 'Arrives in 9 min', 890, '', 4.7, ['Extra luggage'], ['6 seats', 'Child seat on request']),
    ],
    restaurant: [
      o('Toit Terrace', `Rooftop · ${place}`, 1800, 'for two', 4.6, ['Rooftop', 'Live music'], [`Table for ${pick(input, 'people', 2)} at ${pick(input, 'time', '20:00')}`]),
      o('Saffron Courtyard', `North Indian · ${place}`, 1400, 'for two', 4.5, ['Great for family'], ['Quiet section available']),
      o('Olive & Basil', `Italian · ${place}`, 2200, 'for two', 4.7, ['Top rated', 'Candle-lit'], ['Free dessert on birthdays']),
    ],
    food: [
      o('Punjab Grill Express', `${pick(input, 'craving', 'Your pick')} · 30 min`, 540, '', 4.4, ['20% off'], ['Free delivery']),
      o('Behrouz Biryani', 'Royal biryani combos · 35 min', 620, '', 4.5, ['Bestseller'], ['Comes with raita and dessert']),
      o('Home Kitchen by Meera', 'Home-style meals · 25 min', 320, '', 4.7, ['Fastest', 'Budget'], ['Less oil option']),
    ],
    grocery: [
      o('QuickBasket', '12 of 12 items · 11 min', 1240, '', 4.5, ['Fastest'], ['All items in stock']),
      o('FreshMart', '12 of 12 items · 45 min', 1105, '', 4.3, ['Cheapest'], ['₹135 saved vs. average']),
      o('Organic Roots', '11 of 12 items · Tomorrow 8 am', 1560, '', 4.8, ['Organic'], ['Eggs unavailable — substitute offered']),
    ],
    amazon: [
      o(`${product} — Sony WH-1000XM5`, 'Free delivery tomorrow · Prime', 26990, '', 4.6, ["Amazon's Choice"], ['1-year warranty', '10-day replacement']),
      o(`${product} — boAt Nirvana 751`, 'Delivery in 2 days', 3999, '', 4.1, ['Best value'], ['1-year warranty']),
      o(`${product} — JBL Tune 770NC`, 'Free delivery tomorrow', 7499, '', 4.3, ['Top rated in budget'], ['No-cost EMI']),
    ],
    flipkart: [
      o(`${product} — Nothing Phone (3a)`, 'Delivery in 2 days · F-Assured', 24999, '', 4.5, ['₹3,000 bank offer'], ['Exchange up to ₹12,000']),
      o(`${product} — Samsung Galaxy A56`, 'Delivery tomorrow · F-Assured', 29999, '', 4.4, ['No-cost EMI'], ['Exchange up to ₹14,500']),
      o(`${product} — Motorola Edge 60`, 'Delivery in 3 days', 21999, '', 4.3, ['Lowest price'], ['₹2,000 bank offer']),
    ],
    compare: [
      o('Amazon', `${product} · Delivered tomorrow`, 69900, '', 4.6, ['Lowest final price'], ['₹4,000 card cashback']),
      o('Flipkart', `${product} · Delivered in 2 days`, 70499, '', 4.5, ['Exchange offer'], ['No-cost EMI']),
      o('Croma (nearby store)', `${product} · Pick up today`, 71990, '', 4.3, ['Available now'], ['2.1 km away']),
    ],
    gift: [
      o('Personalised Book Box', 'Curated + custom note', 1850, '', 4.8, ['Personalised'], ['Gift wrapped', `Arrives by ${pick(input, 'date', 'your date')}`]),
      o('Scented Candle Trio', 'Handmade soy candles', 1299, '', 4.6, ['Handmade'], ['Gift wrapped']),
      o('Experience: Pottery Class', 'Weekend workshop for one', 2400, '', 4.9, ['Experience gift'], ['E-voucher, sent instantly']),
    ],
    meeting: [
      o('Tomorrow · 11:00–11:30', 'All attendees free', null, '', null, ['Best fit'], ['Morning focus hours respected']),
      o('Tomorrow · 15:00–15:30', 'All attendees free', null, '', null, ['Afternoon'], ['Right after lunch']),
      o('Day after · 10:30–11:00', 'All attendees free', null, '', null, ['Buffer'], ['Leaves time to prepare']),
    ],
    events: [
      o(`${pick(input, 'what', 'Show')} · PVR IMAX`, `${place} · 7:15 pm`, 450, '/ seat', 4.7, ['IMAX'], ['Recliner seats available']),
      o(`${pick(input, 'what', 'Show')} · INOX`, `${place} · 9:30 pm`, 320, '/ seat', 4.4, ['Cheapest'], ['Middle rows available']),
      o(`${pick(input, 'what', 'Show')} · Cinepolis 4DX`, `${place} · 6:00 pm`, 650, '/ seat', 4.6, ['4DX'], ['Combo offer available']),
    ],
    doctor: [
      o('Dr. Ananya Rao', `${pick(input, 'need', 'Specialist')} · 12 yrs exp`, 800, 'fee', 4.8, ['Top rated'], ['Next slot: tomorrow 10:30', 'Speaks English, Hindi, Kannada']),
      o('Dr. Vikram Mehta', `${pick(input, 'need', 'Specialist')} · 18 yrs exp`, 1200, 'fee', 4.7, ['Most experienced'], ['Next slot: tomorrow 17:00']),
      o('City Care Clinic', 'Multi-speciality · Video consult', 499, 'fee', 4.4, ['Available today'], ['Next slot: today 19:30']),
    ],
    bills: [
      o('₹349 · 28 days', '2 GB/day · Unlimited calls', 349, '', null, ['Popular'], ['JioCinema included']),
      o('₹859 · 84 days', '2 GB/day · Unlimited calls', 859, '', null, ['Best value'], ['Works out to ₹10/day']),
      o('₹1,199 · 84 days', '3 GB/day · OTT pack', 1199, '', null, ['OTT bundle'], ['Netflix mobile + Prime']),
    ],
    home: [
      o('Ramesh K. · Verified Pro', `${pick(input, 'service', 'Service')} · 1,240 jobs`, 499, 'visit', 4.8, ['Top rated'], ['30-day service warranty']),
      o('UrbanFix Team', `${pick(input, 'service', 'Service')} · 2 pros`, 699, 'visit', 4.6, ['Faster job'], ['Brings all equipment']),
      o('HomeCare Express', `${pick(input, 'service', 'Service')}`, 399, 'visit', 4.3, ['Budget'], ['Slot in 2 hours']),
    ],
  }
  return catalog[agent.id] ?? []
}

function o(title, subtitle, price, priceNote, rating, badges = [], details = []) {
  return { id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), title, subtitle, price, priceNote, rating, badges, details }
}

function answerFor(agent, input) {
  const ask = pick(input, 'request', agent.name)
  const intro = {
    trip: `## Your ${pick(input, 'days', 4)}-day ${pick(input, 'city', 'trip')} plan\nA ${pick(input, 'style', 'relaxed').toLowerCase()} itinerary built around what you told me.`,
    tutor: `## ${truncate(ask, 70)}\nHere is a clear explanation at ${pick(input, 'level', 'school').toLowerCase()} level.`,
    exam: `## ${pick(input, 'format', 'Practice quiz')} — ${pick(input, 'exam', 'your exam')}${input.topic ? ` · ${input.topic}` : ''}`,
    code: `## ${truncate(ask, 70)}\nLet’s break it down.`,
    career: `## Career guidance\nBased on where you are (${pick(input, 'stage', 'student').toLowerCase()}) and your interests.`,
    email: `## Draft email\nTone: ${pick(input, 'tone', 'professional')}${input.to ? ` · To: ${input.to}` : ''}`,
    summary: `## ${pick(input, 'format', 'Key points')}`,
    data: `## ${pick(input, 'area', 'Business')} analysis\n${truncate(ask, 90)}`,
    hr: `## ${pick(input, 'topic', 'Policy')} — what you need to know`,
  }[agent.id] ?? `## ${agent.name}`

  const body = {
    trip: [
      '## Day by day',
      '- Day 1 — Arrive, check in, easy evening walk and a local dinner.',
      '- Day 2 — The main sights in the morning, a food trail in the afternoon.',
      '- Day 3 — A day trip out of town with a scenic stop for sunset.',
      '- Day 4 — Slow breakfast, markets for souvenirs, head home.',
      '## Tips',
      '- Book stays near the centre to cut travel time.',
      '- Keep the afternoon of day 2 free in case of rain.',
    ],
    email: [
      'Subject: Quick request',
      '',
      'Hi,',
      '',
      `I hope you are doing well. I am writing about the following: ${truncate(ask, 160)}`,
      '',
      'Please let me know if this works for you, or if you would like to discuss it on a quick call.',
      '',
      'Best regards,',
      '[Your name]',
    ],
    exam: [
      '1. Start with the core concepts and one worked example for each.',
      '2. Do 10 timed questions, then review every mistake.',
      '3. Repeat the weak areas after 2 days (spaced revision).',
      '## Quick check',
      '- Q1. Which quantity is conserved in an elastic collision?',
      '- Q2. State the first law of thermodynamics.',
      '- Q3. What is the SI unit of power?',
    ],
  }[agent.id] ?? [
    '## Short answer',
    `The key idea behind "${truncate(ask, 80)}" comes down to a few points.`,
    '## Step by step',
    '1. Start from what is given and what is being asked.',
    '2. Apply the main principle to connect the two.',
    '3. Check the result against a simple example.',
    '## Key takeaways',
    '- Understand the why, not just the what.',
    '- One worked example is worth ten definitions.',
    '- Ask a follow-up below to go deeper on any step.',
  ]

  return [intro, '', ...body].join('\n')
}
