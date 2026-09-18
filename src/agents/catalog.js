/**
 * Every agent the hub offers, as data. The UI is built entirely from this:
 * the card, the brief form, and which flow runs once the brief is sent.
 *
 * `mode` decides the flow:
 *   - 'options' → the agent comes back with choices; the user picks one,
 *                 reviews it, confirms, and gets a reference number.
 *   - 'answer'  → the agent comes back with a written answer and the user
 *                 can keep asking follow-ups.
 *
 * Every agent carries a `request` field. The hub's free-text bar drops what
 * the user typed there, so no agent needs special handling to be routed to.
 */

export const GROUPS = [
  { id: 'travel', label: 'Travel & Stay' },
  { id: 'food', label: 'Food & Dining' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'education', label: 'Education' },
  { id: 'work', label: 'Corporate & Work' },
  { id: 'services', label: 'Life & Services' },
]

const today = () => new Date().toISOString().slice(0, 10)
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10)

const extras = (placeholder) => ({
  name: 'request',
  label: 'Anything else?',
  type: 'textarea',
  placeholder,
  wide: true,
})

export const AGENTS = [
  // ---------- travel ----------
  {
    id: 'hotel',
    name: 'Hotel Booking',
    tagline: 'Find and book stays that fit your dates and budget.',
    group: 'travel',
    icon: 'hotel',
    hue: '#6d5dfc',
    mode: 'options',
    cta: 'Find hotels',
    confirmLabel: 'Book this stay',
    keywords: ['hotel', 'stay', 'room', 'resort', 'hostel', 'accommodation'],
    fields: [
      { name: 'city', label: 'Destination', type: 'text', placeholder: 'Goa, Manali, Dubai…', required: true },
      { name: 'checkIn', label: 'Check-in', type: 'date', default: inDays(7), required: true },
      { name: 'checkOut', label: 'Check-out', type: 'date', default: inDays(9), required: true },
      { name: 'guests', label: 'Guests', type: 'number', default: 2, min: 1, max: 12 },
      { name: 'budget', label: 'Budget / night', type: 'select', options: ['Any', 'Under ₹3,000', '₹3,000–₹7,000', '₹7,000+'] },
      extras('Sea view, pool, pet friendly, near airport…'),
    ],
  },
  {
    id: 'flight',
    name: 'Flight Booking',
    tagline: 'Compare fares across airlines and lock the best one.',
    group: 'travel',
    icon: 'plane',
    hue: '#0ea5e9',
    mode: 'options',
    cta: 'Search flights',
    confirmLabel: 'Book this flight',
    keywords: ['flight', 'fly', 'airline', 'air ticket', 'plane'],
    fields: [
      { name: 'from', label: 'From', type: 'text', placeholder: 'Delhi', required: true },
      { name: 'to', label: 'To', type: 'text', placeholder: 'Bengaluru', required: true },
      { name: 'date', label: 'Departure', type: 'date', default: inDays(5), required: true },
      { name: 'passengers', label: 'Passengers', type: 'number', default: 1, min: 1, max: 9 },
      { name: 'cabin', label: 'Cabin', type: 'select', options: ['Economy', 'Premium economy', 'Business'] },
      extras('Morning flights only, non-stop, window seat…'),
    ],
  },
  {
    id: 'train',
    name: 'Train & Bus',
    tagline: 'Seats on trains and buses, with live availability.',
    group: 'travel',
    icon: 'train',
    hue: '#f97316',
    mode: 'options',
    cta: 'Check availability',
    confirmLabel: 'Book these seats',
    keywords: ['train', 'bus', 'rail', 'irctc', 'sleeper', 'volvo'],
    fields: [
      { name: 'from', label: 'From', type: 'text', placeholder: 'Mumbai', required: true },
      { name: 'to', label: 'To', type: 'text', placeholder: 'Pune', required: true },
      { name: 'date', label: 'Journey date', type: 'date', default: inDays(3), required: true },
      { name: 'mode', label: 'Travel by', type: 'select', options: ['Train or bus', 'Train only', 'Bus only'] },
      { name: 'passengers', label: 'Passengers', type: 'number', default: 1, min: 1, max: 6 },
      extras('Lower berth, AC only, overnight…'),
    ],
  },
  {
    id: 'cab',
    name: 'Cab & Rides',
    tagline: 'Airport drops, city rides and outstation cabs.',
    group: 'travel',
    icon: 'car',
    hue: '#eab308',
    mode: 'options',
    cta: 'Find rides',
    confirmLabel: 'Book this ride',
    keywords: ['cab', 'taxi', 'ride', 'uber', 'ola', 'car', 'airport drop'],
    fields: [
      { name: 'pickup', label: 'Pickup', type: 'text', placeholder: 'Home, office or an address', required: true },
      { name: 'drop', label: 'Drop', type: 'text', placeholder: 'Airport T3', required: true },
      { name: 'date', label: 'Date', type: 'date', default: today() },
      { name: 'time', label: 'Time', type: 'time', default: '09:00' },
      { name: 'vehicle', label: 'Vehicle', type: 'select', options: ['Any', 'Mini', 'Sedan', 'SUV'] },
      extras('Extra luggage, child seat…'),
    ],
  },
  {
    id: 'trip',
    name: 'Trip Planner',
    tagline: 'Day-by-day itineraries built around what you like.',
    group: 'travel',
    icon: 'map',
    hue: '#10b981',
    mode: 'answer',
    cta: 'Plan my trip',
    keywords: ['trip', 'itinerary', 'vacation', 'holiday', 'travel plan', 'tour'],
    fields: [
      { name: 'city', label: 'Where to?', type: 'text', placeholder: 'Kerala', required: true },
      { name: 'days', label: 'Days', type: 'number', default: 4, min: 1, max: 21 },
      { name: 'style', label: 'Travel style', type: 'select', options: ['Relaxed', 'Adventure', 'Culture & food', 'Family'] },
      { name: 'request', label: 'What do you enjoy?', type: 'textarea', placeholder: 'Beaches, local food, less walking…', wide: true },
    ],
    examples: ['Honeymoon, lots of nature', 'With kids and grandparents', 'Backpacking on a budget'],
  },

  // ---------- food ----------
  {
    id: 'restaurant',
    name: 'Restaurant Booking',
    tagline: 'Reserve a table at the right place for the occasion.',
    group: 'food',
    icon: 'dining',
    hue: '#ef4444',
    mode: 'options',
    cta: 'Find tables',
    confirmLabel: 'Reserve this table',
    keywords: ['restaurant', 'table', 'dinner', 'lunch', 'reservation', 'cafe', 'brunch'],
    fields: [
      { name: 'city', label: 'Area or city', type: 'text', placeholder: 'Indiranagar, Bengaluru', required: true },
      { name: 'date', label: 'Date', type: 'date', default: today(), required: true },
      { name: 'time', label: 'Time', type: 'time', default: '20:00', required: true },
      { name: 'people', label: 'People', type: 'number', default: 2, min: 1, max: 20 },
      { name: 'cuisine', label: 'Cuisine', type: 'select', options: ['Any', 'North Indian', 'South Indian', 'Italian', 'Chinese', 'Continental'] },
      extras('Birthday, rooftop, vegetarian, quiet corner…'),
    ],
  },
  {
    id: 'food',
    name: 'Food Delivery',
    tagline: 'Tell it what you are craving; it finds and orders it.',
    group: 'food',
    icon: 'bag',
    hue: '#f43f5e',
    mode: 'options',
    cta: 'Find food',
    confirmLabel: 'Place order',
    keywords: ['food', 'order food', 'delivery', 'pizza', 'biryani', 'hungry', 'swiggy', 'zomato'],
    fields: [
      { name: 'craving', label: 'What are you craving?', type: 'text', placeholder: 'Butter chicken and naan', required: true },
      { name: 'address', label: 'Deliver to', type: 'text', placeholder: 'Home', required: true },
      { name: 'diet', label: 'Diet', type: 'select', options: ['No preference', 'Veg', 'Non-veg', 'Vegan', 'Jain'] },
      { name: 'budget', label: 'Budget', type: 'select', options: ['Any', 'Under ₹300', '₹300–₹700', '₹700+'] },
      extras('Less spicy, no onion, extra cutlery…'),
    ],
  },
  {
    id: 'grocery',
    name: 'Groceries',
    tagline: 'Turn a shopping list into a delivered basket.',
    group: 'food',
    icon: 'cart',
    hue: '#22c55e',
    mode: 'options',
    cta: 'Build basket',
    confirmLabel: 'Order basket',
    keywords: ['grocery', 'groceries', 'vegetables', 'milk', 'blinkit', 'zepto', 'instamart'],
    fields: [
      { name: 'list', label: 'Your list', type: 'textarea', placeholder: 'Milk 2L, eggs 12, atta 5kg, bananas…', required: true, wide: true },
      { name: 'address', label: 'Deliver to', type: 'text', placeholder: 'Home', required: true },
      { name: 'speed', label: 'Delivery', type: 'select', options: ['Fastest', 'Cheapest', 'Scheduled'] },
      extras('Prefer organic, specific brands…'),
    ],
  },

  // ---------- shopping ----------
  {
    id: 'amazon',
    name: 'Amazon Orders',
    tagline: 'Search, compare and order products on Amazon.',
    group: 'shopping',
    icon: 'package',
    hue: '#f59e0b',
    mode: 'options',
    cta: 'Search products',
    confirmLabel: 'Place order',
    keywords: ['amazon', 'buy', 'order product'],
    fields: [
      { name: 'product', label: 'What do you want to buy?', type: 'text', placeholder: 'Noise-cancelling headphones', required: true },
      { name: 'budget', label: 'Max budget (₹)', type: 'number', placeholder: '10000', min: 0 },
      { name: 'sort', label: 'Prefer', type: 'select', options: ['Best rated', 'Lowest price', 'Fastest delivery'] },
      { name: 'address', label: 'Deliver to', type: 'text', placeholder: 'Home' },
      extras('Colour, brand, must have warranty…'),
    ],
  },
  {
    id: 'flipkart',
    name: 'Flipkart Orders',
    tagline: 'Deals, offers and orders on Flipkart.',
    group: 'shopping',
    icon: 'tag',
    hue: '#3b82f6',
    mode: 'options',
    cta: 'Search deals',
    confirmLabel: 'Place order',
    keywords: ['flipkart', 'deal', 'sale', 'offer'],
    fields: [
      { name: 'product', label: 'What do you want to buy?', type: 'text', placeholder: '5G phone with good camera', required: true },
      { name: 'budget', label: 'Max budget (₹)', type: 'number', placeholder: '25000', min: 0 },
      { name: 'offers', label: 'Use offers', type: 'select', options: ['Bank offers + exchange', 'Bank offers only', 'No offers'] },
      { name: 'address', label: 'Deliver to', type: 'text', placeholder: 'Home' },
      extras('Colour, storage, exchange my old phone…'),
    ],
  },
  {
    id: 'compare',
    name: 'Price Compare',
    tagline: 'One product, every store, the lowest real price.',
    group: 'shopping',
    icon: 'scale',
    hue: '#8b5cf6',
    mode: 'options',
    cta: 'Compare prices',
    confirmLabel: 'Buy from this store',
    keywords: ['compare', 'cheapest', 'lowest price', 'price'],
    fields: [
      { name: 'product', label: 'Product', type: 'text', placeholder: 'iPhone 16, 128 GB', required: true },
      { name: 'include', label: 'Stores', type: 'select', options: ['All stores', 'Online only', 'Nearby offline stores too'] },
      extras('Include cashback, EMI options…'),
    ],
  },
  {
    id: 'gift',
    name: 'Gift Finder',
    tagline: 'Thoughtful gift ideas for anyone, delivered on time.',
    group: 'shopping',
    icon: 'gift',
    hue: '#ec4899',
    mode: 'options',
    cta: 'Find gifts',
    confirmLabel: 'Send this gift',
    keywords: ['gift', 'present', 'birthday gift', 'anniversary'],
    fields: [
      { name: 'for', label: 'Who is it for?', type: 'text', placeholder: 'My sister, 24, loves books', required: true },
      { name: 'occasion', label: 'Occasion', type: 'select', options: ['Birthday', 'Anniversary', 'Wedding', 'Festival', 'Thank you'] },
      { name: 'budget', label: 'Budget (₹)', type: 'number', placeholder: '2000', min: 0 },
      { name: 'date', label: 'Needed by', type: 'date', default: inDays(4) },
      extras('Handmade, personalised, gift wrap…'),
    ],
  },

  // ---------- education ----------
  {
    id: 'tutor',
    name: 'Study Q&A',
    tagline: 'Clear answers to any subject question, step by step.',
    group: 'education',
    icon: 'cap',
    hue: '#6366f1',
    mode: 'answer',
    cta: 'Get answer',
    keywords: ['question', 'explain', 'study', 'homework', 'physics', 'maths', 'math', 'chemistry', 'biology', 'history'],
    fields: [
      { name: 'subject', label: 'Subject', type: 'select', options: ['Any', 'Maths', 'Physics', 'Chemistry', 'Biology', 'History', 'Economics', 'English'] },
      { name: 'level', label: 'Level', type: 'select', options: ['School', 'Higher secondary', 'Undergraduate', 'Postgraduate'] },
      { name: 'request', label: 'Your question', type: 'textarea', placeholder: 'Why is the sky blue?', required: true, wide: true },
    ],
    examples: ['Explain photosynthesis simply', 'Solve x² − 5x + 6 = 0', 'Causes of World War I'],
  },
  {
    id: 'exam',
    name: 'Exam Prep',
    tagline: 'Practice quizzes, revision notes and study plans.',
    group: 'education',
    icon: 'checklist',
    hue: '#14b8a6',
    mode: 'answer',
    cta: 'Build my prep',
    keywords: ['exam', 'quiz', 'revision', 'test', 'jee', 'neet', 'upsc', 'cat', 'practice'],
    fields: [
      { name: 'exam', label: 'Exam', type: 'text', placeholder: 'JEE Main, class 12 boards…', required: true },
      { name: 'topic', label: 'Topic', type: 'text', placeholder: 'Thermodynamics' },
      { name: 'format', label: 'I want', type: 'select', options: ['Practice quiz', 'Revision notes', 'Study plan'] },
      { name: 'request', label: 'Anything else?', type: 'textarea', placeholder: 'Exam is in 3 weeks, weak in numericals…', wide: true },
    ],
    examples: ['10 MCQs on Newton’s laws', '2-week plan for organic chemistry'],
  },
  {
    id: 'code',
    name: 'Coding Mentor',
    tagline: 'Debug code, learn concepts, and review solutions.',
    group: 'education',
    icon: 'code',
    hue: '#0891b2',
    mode: 'answer',
    cta: 'Ask mentor',
    keywords: ['code', 'coding', 'bug', 'error', 'javascript', 'python', 'java', 'react', 'programming', 'dsa'],
    fields: [
      { name: 'language', label: 'Language', type: 'select', options: ['Any', 'JavaScript', 'Python', 'Java', 'C++', 'SQL'] },
      { name: 'request', label: 'Your question or code', type: 'textarea', placeholder: 'Paste code or describe the problem…', required: true, wide: true, rows: 6 },
    ],
    examples: ['Explain closures in JavaScript', 'Reverse a linked list in Python'],
  },
  {
    id: 'career',
    name: 'Career Guide',
    tagline: 'Courses, colleges and career paths that suit you.',
    group: 'education',
    icon: 'compass',
    hue: '#a855f7',
    mode: 'answer',
    cta: 'Get guidance',
    keywords: ['career', 'college', 'course', 'admission', 'job switch', 'resume', 'cv'],
    fields: [
      { name: 'stage', label: 'Where are you now?', type: 'select', options: ['School student', 'College student', 'Working professional', 'Career break'] },
      { name: 'interests', label: 'Interests', type: 'text', placeholder: 'Design, data, biology…' },
      { name: 'request', label: 'What do you want to figure out?', type: 'textarea', placeholder: 'Should I do an MBA or a master’s in data science?', required: true, wide: true },
    ],
    examples: ['Move from testing to development', 'Best courses after 12th commerce'],
  },

  // ---------- work ----------
  {
    id: 'email',
    name: 'Email Writer',
    tagline: 'Professional emails and replies in the right tone.',
    group: 'work',
    icon: 'mail',
    hue: '#2563eb',
    mode: 'answer',
    cta: 'Draft email',
    keywords: ['email', 'mail', 'reply', 'write to', 'draft'],
    fields: [
      { name: 'to', label: 'Writing to', type: 'text', placeholder: 'Client, manager, HR…' },
      { name: 'tone', label: 'Tone', type: 'select', options: ['Professional', 'Friendly', 'Firm', 'Apologetic', 'Persuasive'] },
      { name: 'request', label: 'What should it say?', type: 'textarea', placeholder: 'Ask for a 1-week extension on the Q3 report…', required: true, wide: true },
    ],
    examples: ['Follow up on an unpaid invoice', 'Politely decline a meeting'],
  },
  {
    id: 'meeting',
    name: 'Meeting Scheduler',
    tagline: 'Finds a slot that works for everyone and sends invites.',
    group: 'work',
    icon: 'calendar',
    hue: '#0d9488',
    mode: 'options',
    cta: 'Find slots',
    confirmLabel: 'Send invites',
    keywords: ['meeting', 'schedule', 'calendar', 'invite', 'call', 'sync'],
    fields: [
      { name: 'title', label: 'Meeting title', type: 'text', placeholder: 'Q3 planning', required: true },
      { name: 'attendees', label: 'Attendees', type: 'text', placeholder: 'priya@acme.com, rahul@acme.com', required: true },
      { name: 'duration', label: 'Duration', type: 'select', options: ['30 min', '15 min', '45 min', '60 min'] },
      { name: 'date', label: 'Around', type: 'date', default: inDays(1) },
      extras('Agenda, prefer afternoons, add video link…'),
    ],
  },
  {
    id: 'summary',
    name: 'Doc & Report Summary',
    tagline: 'Summaries, key points and action items from any text.',
    group: 'work',
    icon: 'doc',
    hue: '#7c3aed',
    mode: 'answer',
    cta: 'Summarise',
    keywords: ['summary', 'summarise', 'summarize', 'report', 'minutes', 'notes', 'tl;dr'],
    fields: [
      { name: 'format', label: 'Output', type: 'select', options: ['Key points', 'Executive summary', 'Action items', 'Meeting minutes'] },
      { name: 'request', label: 'Paste the text', type: 'textarea', placeholder: 'Paste a report, transcript or long email…', required: true, wide: true, rows: 7 },
    ],
  },
  {
    id: 'data',
    name: 'Data Insights',
    tagline: 'Ask business questions and get analysis you can use.',
    group: 'work',
    icon: 'chart',
    hue: '#06b6d4',
    mode: 'answer',
    cta: 'Analyse',
    keywords: ['data', 'analysis', 'sales', 'revenue', 'kpi', 'metrics', 'excel', 'forecast'],
    fields: [
      { name: 'area', label: 'Area', type: 'select', options: ['Sales', 'Marketing', 'Finance', 'Operations', 'HR'] },
      { name: 'request', label: 'Your question', type: 'textarea', placeholder: 'Why did Q2 revenue drop in the north region?', required: true, wide: true },
    ],
    examples: ['Which KPIs should a SaaS startup track?', 'How to forecast next quarter sales'],
  },
  {
    id: 'hr',
    name: 'HR & Policy Help',
    tagline: 'Leave, payroll, and policy questions answered fast.',
    group: 'work',
    icon: 'people',
    hue: '#d946ef',
    mode: 'answer',
    cta: 'Ask HR',
    keywords: ['hr', 'leave', 'policy', 'payroll', 'salary', 'appraisal', 'notice period', 'reimbursement'],
    fields: [
      { name: 'topic', label: 'Topic', type: 'select', options: ['Leave', 'Payroll', 'Benefits', 'Travel & expenses', 'Onboarding', 'Other'] },
      { name: 'request', label: 'Your question', type: 'textarea', placeholder: 'How many casual leaves can I carry forward?', required: true, wide: true },
    ],
    examples: ['How do I claim travel expenses?', 'What is the notice period policy?'],
  },

  // ---------- services ----------
  {
    id: 'events',
    name: 'Movies & Events',
    tagline: 'Tickets for movies, concerts, plays and sports.',
    group: 'services',
    icon: 'ticket',
    hue: '#e11d48',
    mode: 'options',
    cta: 'Find shows',
    confirmLabel: 'Book tickets',
    keywords: ['movie', 'film', 'concert', 'event', 'show', 'ticket', 'match', 'bookmyshow'],
    fields: [
      { name: 'what', label: 'Movie or event', type: 'text', placeholder: 'Latest action movie, standup…', required: true },
      { name: 'city', label: 'City', type: 'text', placeholder: 'Hyderabad', required: true },
      { name: 'date', label: 'Date', type: 'date', default: today() },
      { name: 'seats', label: 'Seats', type: 'number', default: 2, min: 1, max: 10 },
      extras('Recliner, IMAX, evening show…'),
    ],
  },
  {
    id: 'doctor',
    name: 'Doctor Appointment',
    tagline: 'Book clinics and online consults with the right specialist.',
    group: 'services',
    icon: 'health',
    hue: '#16a34a',
    mode: 'options',
    cta: 'Find doctors',
    confirmLabel: 'Book appointment',
    keywords: ['doctor', 'appointment', 'clinic', 'hospital', 'consult', 'dentist', 'fever', 'checkup'],
    fields: [
      { name: 'need', label: 'Symptoms or specialist', type: 'text', placeholder: 'Dermatologist, back pain…', required: true },
      { name: 'city', label: 'Area', type: 'text', placeholder: 'Near me' },
      { name: 'type', label: 'Consult', type: 'select', options: ['In clinic', 'Video call'] },
      { name: 'date', label: 'Preferred date', type: 'date', default: inDays(1) },
      extras('Female doctor, speaks Hindi, insurance accepted…'),
    ],
  },
  {
    id: 'bills',
    name: 'Bills & Recharge',
    tagline: 'Mobile, DTH, electricity and other bills in one place.',
    group: 'services',
    icon: 'bolt',
    hue: '#ca8a04',
    mode: 'options',
    cta: 'Fetch plans',
    confirmLabel: 'Pay now',
    keywords: ['bill', 'recharge', 'electricity', 'mobile recharge', 'dth', 'broadband', 'pay'],
    fields: [
      { name: 'kind', label: 'Bill type', type: 'select', options: ['Mobile recharge', 'Electricity', 'Broadband', 'DTH', 'Gas', 'Water'] },
      { name: 'account', label: 'Number / account ID', type: 'text', placeholder: '98XXXXXX10', required: true },
      { name: 'provider', label: 'Provider', type: 'text', placeholder: 'Jio, Airtel, BESCOM…' },
      extras('Best plan with OTT, 84 days validity…'),
    ],
  },
  {
    id: 'home',
    name: 'Home Services',
    tagline: 'Cleaners, electricians, plumbers and repairs at home.',
    group: 'services',
    icon: 'tools',
    hue: '#64748b',
    mode: 'options',
    cta: 'Find pros',
    confirmLabel: 'Book service',
    keywords: ['plumber', 'electrician', 'cleaning', 'repair', 'ac service', 'carpenter', 'salon', 'pest'],
    fields: [
      { name: 'service', label: 'Service', type: 'select', options: ['Home cleaning', 'Electrician', 'Plumber', 'AC service', 'Carpenter', 'Pest control', 'Salon at home'] },
      { name: 'address', label: 'Address', type: 'text', placeholder: 'Flat 402, Green Towers', required: true },
      { name: 'date', label: 'Date', type: 'date', default: inDays(1), required: true },
      { name: 'time', label: 'Time', type: 'time', default: '10:00' },
      extras('Describe the problem…'),
    ],
  },
]

export const AGENTS_BY_ID = Object.fromEntries(AGENTS.map((agent) => [agent.id, agent]))

/**
 * Best agent for free text typed into the hub. A keyword hit in the text
 * counts more than a hit in the name, and longer keywords beat shorter ones so
 * "order food" goes to delivery, not to the shopping agents.
 */
export function routeRequest(text) {
  const query = text.toLowerCase()
  let best = null
  let bestScore = 0
  for (const agent of AGENTS) {
    let score = 0
    for (const keyword of agent.keywords) {
      if (query.includes(keyword)) score += 2 + keyword.length / 10
    }
    if (query.includes(agent.name.toLowerCase())) score += 1
    if (score > bestScore) {
      best = agent
      bestScore = score
    }
  }
  return best
}

/** Initial form values: each field's default, or the first option of a select. */
export function initialValues(agent, request = '') {
  const values = {}
  for (const field of agent.fields) {
    if (field.default !== undefined) values[field.name] = field.default
    else if (field.type === 'select') values[field.name] = field.options[0]
    else values[field.name] = ''
  }
  if (request) values.request = request
  return values
}
