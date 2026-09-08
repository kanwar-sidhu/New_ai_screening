/**
 * Reading a pasted job description.
 *
 * The role form used to ask for every field one at a time, which is the same
 * information typed twice: a recruiter already has the JD written down, and the
 * title, the location and the skills are all sitting inside it. So the paste is
 * now the only input, and this file is what pulls the fields back out of it.
 *
 * It is deliberately a plain reader rather than a model call: it runs in the
 * browser with nothing to start and nothing to pay for, and — more to the point
 * — it is explainable. Every field it fills in can be traced to a line of the
 * text, and a field it cannot find is left blank rather than invented.
 *
 * Three things are recognised, in this order:
 *
 *   1. labelled lines   — "Location: Bengaluru", the easiest and most reliable
 *   2. sections         — a heading such as "Must-have skills:" and the bullets
 *                         under it, up to the next heading
 *   3. loose patterns   — "5+ years", "Full-time", a known technology name
 *
 * An earlier rule always wins, so an explicit label is never overruled by a
 * guess made further down the page.
 */

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship']

/** What an empty reading looks like — the same shape a role is saved in. */
export const emptyFields = {
  title: '',
  department: '',
  location: '',
  employmentType: '',
  experience: '',
  mustSkills: '',
  goodSkills: '',
  preferredSkills: '',
}

/* ---------------- labelled lines ---------------- */

/*
 * "Department: Engineering". The label is matched whole, so a sentence that
 * merely mentions the word is not mistaken for one — and each field lists the
 * wordings JDs actually use for it.
 */
const LABELS = [
  ['title', /^(job\s*)?(title|role|position|designation|job\s*role)$/],
  ['department', /^(department|team|function|business\s*unit)$/],
  ['location', /^(location|work\s*location|based\s*(in|at)|place\s*of\s*work|office)$/],
  [
    'employmentType',
    /^((employment|job|contract|engagement|position)\s*type|type\s*of\s*(employment|job)|employment)$/,
  ],
  [
    'experience',
    /^((years?\s*of\s*)?experience(\s*(required|range|level|needed))?|exp)$/,
  ],
  ['mustSkills', /^(must[\s-]*have|required|mandatory|essential|core|key)\s*(skills?|technologies)?$/],
  ['goodSkills', /^(good|nice)[\s-]*to[\s-]*have\s*(skills?)?$/],
  ['preferredSkills', /^(preferred|desirable|bonus)\s*(skills?|qualifications?)?$/],
]

/** Splits "Label: value" into its two halves, or null when the line is not one. */
function labelled(line) {
  const at = line.indexOf(':')
  if (at < 1) return null
  const label = line.slice(0, at).trim().replace(/^[•*·\-–—\d.\s]+/, '')
  // a label is a few words, not a sentence that happens to contain a colon
  if (!label || label.length > 40 || label.split(/\s+/).length > 5) return null
  return { label: label.toLowerCase(), value: line.slice(at + 1).trim() }
}

/** Which field a label names, if any. */
const fieldFor = (label) => LABELS.find(([, re]) => re.test(label))?.[0] || null

/* ---------------- sections ---------------- */

/*
 * Headings that open a run of skills. `good` is tested before `pref` so that
 * "nice to have" is not swallowed by a looser preferred-qualifications rule,
 * and the broad requirements wordings come last — they only apply when nothing
 * more specific matched.
 */
const SKILL_SECTIONS = [
  ['goodSkills', /(good|nice)[\s-]*to[\s-]*have|desirable|bonus|added\s*advantage|plus\s*points?/],
  ['preferredSkills', /preferred|optional|good\s*to\s*know/],
  [
    'mustSkills',
    /must[\s-]*have|required|requirements|mandatory|essential|qualifications?|what\s*you.*(need|bring)|skills?\s*(&|and)?\s*(requirements?|experience)?$|technical\s*skills?|core\s*competenc/,
  ],
]

/*
 * "Knowledge of:", "Hands-on experience with at least one of the following:" —
 * a heading that opens no new section but introduces more of the current one.
 * Treating it as a heading would drop the list underneath it.
 */
const LEAD_IN =
  /^(knowledge|understanding|experience|expertise|familiarity|proficiency|exposure|ability|hands[\s-]*on|skills?|strong|good|including|such\s+as|for\s+example|at\s+least|one\s+of|the\s+following|examples?)\b/i

/** A line is a heading when it ends in a colon, or is a short bare title line. */
const isSectionHead = (line) =>
  /:\s*$/.test(line) || (/^[A-Za-z][\w\s&/'-]{2,44}$/.test(line) && line.split(/\s+/).length <= 6)

/** Which skill list a heading opens, if it opens one at all. */
function sectionFor(line) {
  const head = line.replace(/:\s*$/, '').trim().toLowerCase()
  if (!head || head.length > 60) return null
  return SKILL_SECTIONS.find(([, re]) => re.test(head))?.[0] || null
}

/* ---------------- loose patterns ---------------- */

/**
 * The technologies worth naming as skills.
 *
 * Only used to top up a skills list that the sections did not fill — a JD
 * written as prose has no bullets to read, but it still says "React" and
 * "PostgreSQL" somewhere, and those are the words a recruiter would have typed
 * into the field by hand.
 */
const TECH = [
  'JavaScript', 'TypeScript', 'React Native', 'React.js', 'React', 'Angular', 'Vue', 'Svelte',
  'Next.js', 'Node.js', 'Express', 'Django ORM', 'Django', 'Flask', 'FastAPI', 'SQLAlchemy',
  'Spring Boot', 'Spring', '.NET', 'Rails', 'Celery', 'Nginx',
  'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Kotlin', 'Swift', 'Scala',
  'HTML5', 'HTML', 'CSS3', 'CSS', 'SASS', 'Tailwind', 'Redux', 'GraphQL', 'REST APIs', 'RESTful APIs',
  'gRPC', 'WebSockets', 'OAuth', 'JWT', 'Swagger', 'OpenAPI',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra', 'DynamoDB',
  'AWS', 'Azure', 'Google Cloud', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD',
  'GitHub Actions', 'GitHub', 'GitLab', 'Git',
  'Linux', 'Unix', 'Kafka', 'RabbitMQ', 'Spark', 'Hadoop', 'Airflow', 'Snowflake', 'Tableau',
  'Power BI', 'Machine Learning', 'Deep Learning', 'NLP', 'TensorFlow', 'PyTorch', 'Pandas',
  'NumPy', 'Jest', 'Cypress', 'Selenium', 'Playwright', 'JUnit', 'PyTest',
  'Figma', 'Accessibility', 'Design systems', 'Agile', 'Scrum', 'Microservices', 'System design',
  'Distributed systems',
]

/** Technology names present in the text, in the order this list has them. */
const techIn = (text) =>
  TECH.filter((name) => {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // a name may end in a symbol (".NET", "C++"), so only guard the side that has a letter
    return new RegExp(`(^|[^\\w+#.])${escaped}(?![\\w+#.])`, 'i').test(text)
  })

/** "3–6 years", "5+ years", "at least 4 years" — whichever the JD wrote. */
function findExperience(text) {
  const range = text.match(/(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\s*\+?\s*years?/i)
  if (range) return `${range[1]}–${range[2]} years`
  const plus = text.match(/(\d{1,2})\s*\+\s*years?/i)
  if (plus) return `${plus[1]}+ years`
  const least = text.match(/(?:at\s*least|minimum(?:\s*of)?|min\.?)\s*(\d{1,2})\s*years?/i)
  if (least) return `${least[1]}+ years`
  const plain = text.match(/(\d{1,2})\s*years?\s*(?:of\s*)?(?:relevant\s*|professional\s*)?experience/i)
  return plain ? `${plain[1]} years` : ''
}

/** Full-time and its neighbours, however they were spelled. */
function findEmploymentType(text) {
  const found = EMPLOYMENT_TYPES.find((type) =>
    new RegExp(`\\b${type.replace('-', '[\\s-]?')}\\b`, 'i').test(text)
  )
  if (found) return found
  return /\bintern(ship)?\b/i.test(text) ? 'Internship' : ''
}

/** Remote, hybrid or on-site, with the place it sits next to when there is one. */
function findLocation(lines) {
  const line = lines.find((l) => /\b(remote|hybrid|on[\s-]?site|work\s*from\s*home)\b/i.test(l))
  if (!line) return ''
  const clean = line.replace(/^[•*·\-–—\s]+/, '').trim()
  // a whole sentence is not a location — only a short standalone line is
  if (clean.length <= 60) return clean
  const word = clean.match(/\b(remote|hybrid|on[\s-]?site)\b/i)
  return word ? word[0].replace(/^\w/, (c) => c.toUpperCase()) : ''
}

/**
 * The opening line, cleaned up into a job title.
 *
 * Most JDs lead with it. Anything after "at", "|" or "—" is the company or the
 * location rather than the role, so it is dropped.
 */
function findTitle(lines) {
  const first = lines.find(
    (l) =>
      // "Job description:" on its own is the page's heading rather than the role
      // — but "Job description: Data Engineer" is the role, so only the bare
      // form is skipped
      l.trim() && !/^\s*(job\s*description|about\s*(us|the\s*company))\s*:?\s*$/i.test(l)
  )
  if (!first) return ''
  const inner = labelled(first)
  const raw = inner?.value || first
  return raw
    .replace(/^[•*·\-–—#\s]+/, '')
    .split(/\s+\bat\b\s+|\s+[|–—]\s+/)[0]
    .replace(/[,;:.]\s*$/, '')
    .trim()
    .slice(0, 80)
}

/* ---------------- turning section lines into skills ---------------- */

const MAX_SKILLS = 24

/** One bullet, minus its bullet. */
const unbullet = (line) => line.replace(/^[•*·▪◦o\-–—]+\s*|^\d+[.)]\s*/, '').trim()

/*
 * How a JD says "this is a skill" before naming one. Stripping the phrase turns
 * "Strong hands-on experience with Python" into "Python", which is the entry a
 * recruiter would have typed — and it makes the comma rule below trustworthy,
 * because what is left is the list rather than the sentence around it.
 */
const FILLER =
  /^(strong|good|solid|excellent|basic|working|deep|proven|prior|relevant|practical|professional|advanced|sound)?\s*(hands[\s-]*on\s*)?(knowledge|understanding|experience|expertise|familiarity|proficiency|exposure|ability|command|skills?)\s*(of|with|in|to|using|on)?\s+/i

/*
 * Responsibilities are written as verbs — "Design and maintain schemas",
 * "Write unit tests" — and they are duties rather than skills. A line that
 * opens with one is not read as a list; only the technologies named inside it
 * are kept.
 */
const DUTY =
  /^(design|develop|build|creat|writ|implement|integrat|maintain|manag|debug|deploy|test|review|participat|collaborat|monitor|troubleshoot|follow|contribut|us|work|ensur|deliver|resolv|optimi[sz]|perform|conduct|support|assist|handl|driv|lead|own|coordinat|analy[sz]|prepar|provid|architect|migrat|scal|refactor)(e|es|ed|ing|s)?\b/i

/*
 * Words that are the shape of a JD rather than anything a candidate has. These
 * turn up as the sub-headings inside a skills section — "Programming",
 * "Database", "Version Control" — and would otherwise be read as skills.
 */
const NOT_A_SKILL = new Set(
  [
    'programming', 'backend', 'back end', 'backend development', 'frontend', 'front end',
    'frontend development', 'database', 'databases', 'version control', 'experience',
    'education', 'skills', 'key skills', 'technical', 'technical skills', 'tools',
    'technologies', 'other', 'others', 'general', 'requirements', 'responsibilities',
    'key responsibilities', 'qualifications', 'summary', 'overview', 'benefits', 'salary',
    'location', 'department', 'job type', 'employment type', 'notice period', 'must have',
    'must-have', 'good to have', 'good-to-have', 'nice to have', 'preferred', 'role',
    'about us', 'about the company', 'job summary', 'job description', 'the following',
  ].map((s) => s.toLowerCase())
)

/** Whether a fragment reads as something a candidate could actually have. */
function isSkill(item) {
  if (!item || item.length < 2 || item.length > 48) return false
  if (NOT_A_SKILL.has(item.toLowerCase())) return false
  // lead-ins and sentence remnants, never skills
  if (/^(at\s+least|one\s+of|the\s+following|such\s+as|including|etc|we\s|you\s|candidates?\s|this\s|their\s|our\s)/i.test(item))
    return false
  if (DUTY.test(item)) return false
  return item.split(/\s+/).length <= 5
}

/** "and Docker" / "or GitLab" — the joining word belongs to the list, not the item. */
const trimJoin = (part) => part.replace(/^(and|or|as\s+well\s+as)\s+/i, '').trim()

/**
 * What one line of a skills section is worth.
 *
 * The lead-in is stripped first, so a comma list is read as a list even when a
 * phrase introduced it. A run of short parts is that list; a short line on its
 * own is a single skill; anything longer is prose, and only the technologies
 * named inside it are taken.
 *
 * Nothing is split on "/" — "CI/CD", "Linux/Unix" and "Swagger/OpenAPI" are
 * each one thing, and a JD that means two writes a comma.
 */
function skillsFromLine(line) {
  const raw = unbullet(line).replace(/[.;,]\s*$/, '')
  if (!raw) return []

  // a name that is itself a technology is taken whole, whatever it contains
  const whole = TECH.find((name) => name.toLowerCase() === raw.toLowerCase())
  if (whole) return [whole]

  const text = raw.replace(FILLER, '').trim()
  if (!text) return []

  // a duty is not a skill, but it still names the stack it is carried out in
  if (DUTY.test(text)) return techIn(text)

  const parts = text
    .split(/\s*[,|;]\s*|\s+\b(?:and|or)\b\s+/i)
    .map((p) => trimJoin(p || ''))
    .filter(Boolean)

  // a real list is short items; a sentence with commas in it is not
  if (parts.length > 1 && parts.every((p) => p.split(/\s+/).length <= 3))
    return parts.filter(isSkill)

  if (isSkill(text)) return [text]

  return techIn(text)
}

/**
 * Trims a list down to what a card can show.
 *
 * A long "Must-have" section runs past the cap, and cutting it at the end would
 * lose whatever the JD happened to mention last — often the database or the
 * version control it is built on. So named technologies are kept first and the
 * looser phrases give up the remaining places, while the list stays in the
 * order the description wrote it.
 */
function cap(items) {
  if (items.length <= MAX_SKILLS) return items

  const known = new Set(TECH.map((t) => t.toLowerCase()))
  const keep = new Set(items.filter((i) => known.has(i.toLowerCase())).slice(0, MAX_SKILLS))
  for (const item of items) {
    if (keep.size >= MAX_SKILLS) break
    keep.add(item)
  }
  return items.filter((i) => keep.has(i))
}

/** Case-insensitive de-duplication that keeps the first spelling seen. */
function unique(items) {
  const seen = new Set()
  const out = []
  for (const item of items) {
    const key = item.toLowerCase()
    if (!item || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/* ---------------- the reader ---------------- */

/**
 * Reads a pasted job description into the fields a role is saved with.
 *
 * The description itself is handed back untouched — it is what screening
 * matches resumes against, and trimming it would be throwing away the input.
 */
export function parseJd(text) {
  const description = text || ''
  const lines = description.split('\n').map((l) => l.trimEnd())
  const fields = { ...emptyFields }
  const skills = { mustSkills: [], goodSkills: [], preferredSkills: [] }

  // which skill list the bullets currently being read belong to, if any
  let section = null

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const pair = labelled(trimmed)
    if (pair) {
      const field = fieldFor(pair.label)

      // "Must-have skills: React, Node" — the list is on the label's own line
      if (field && field in skills) {
        section = field
        if (pair.value) skills[field].push(...skillsFromLine(pair.value))
        continue
      }

      // a plain field, taken only the first time it appears
      if (field && pair.value && !fields[field]) {
        fields[field] = pair.value.slice(0, 120)
        section = null
        continue
      }

      // an unrecognised "Heading:" ends whatever section was open — unless it
      // is a lead-in, which introduces more of the section it sits inside
      if (!pair.value) {
        section = sectionFor(pair.label) || (LEAD_IN.test(pair.label) ? section : null)
        continue
      }
    }

    if (isSectionHead(trimmed)) {
      const next = sectionFor(trimmed)
      // a bare line that names no section closes the current one rather than
      // letting unrelated bullets pile into it
      if (next || !section) {
        section = next
        continue
      }
    }

    // a line that ends in a colon is announcing what follows, never a skill in
    // its own right — "Hands-on experience with at least one of the following:"
    if (section && !/:\s*$/.test(trimmed)) skills[section].push(...skillsFromLine(trimmed))
  }

  // what the sections did not say, the text as a whole usually still does
  if (!fields.title) fields.title = findTitle(lines)
  if (!fields.experience) fields.experience = findExperience(description)
  if (!fields.employmentType) fields.employmentType = findEmploymentType(description)
  if (!fields.location) fields.location = findLocation(lines)

  // a JD written as prose has no bullets to read, but it still names its stack
  if (!skills.mustSkills.length) skills.mustSkills.push(...techIn(description))

  for (const key of Object.keys(skills)) {
    fields[key] = cap(unique(skills[key])).join(', ')
  }

  // older roles kept a single `skills` string, and parts of the app still read it
  return { ...fields, description, skills: fields.mustSkills }
}
