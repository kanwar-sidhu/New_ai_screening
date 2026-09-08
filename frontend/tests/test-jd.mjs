import { parseJd } from '../src/lib/jd.js'

const JD = `Senior Frontend Engineer
Department: Engineering
Location: Bengaluru / Remote
Employment type: Full-time
Experience: 3-6 years

Must-have skills:
· React, TypeScript, REST APIs

Good-to-have skills:
· GraphQL, CI/CD

Responsibilities:
· Build and maintain the design system
`

const jd = parseJd(JD)
const list = (value) => value.split(',').map((s) => s.trim()).filter(Boolean)

const checks = [
  ['the first line becomes the title', jd.title === 'Senior Frontend Engineer'],
  ['a labelled department is read', jd.department === 'Engineering'],
  ['a labelled location is read', jd.location === 'Bengaluru / Remote'],
  ['a labelled employment type is read', jd.employmentType === 'Full-time'],
  // a label is taken at its word — the loose "3–6 years" reading is only for
  // descriptions that never wrote an Experience: line
  ['a labelled experience is read verbatim', jd.experience === '3-6 years'],
  ['an unlabelled range is normalised', parseJd('Data Engineer\nWe want 3 to 6 years of experience.').experience === '3–6 years'],
  ['must-have bullets become the must list', list(jd.mustSkills).join('|') === 'React|TypeScript|REST APIs'],
  ['good-to-have bullets become the good list', list(jd.goodSkills).join('|') === 'GraphQL|CI/CD'],
  ['a responsibility is not read as a skill', !list(jd.mustSkills).includes('Build and maintain the design system')],
  ['the description is handed back untouched', jd.description === JD],
  ['prose with no bullets still names its stack', list(parseJd('We use Python, PostgreSQL and Docker daily.').mustSkills).join('|') === 'Python|PostgreSQL|Docker'],
  ['an empty paste reads as empty', parseJd('').title === ''],
]

let failed = 0
for (const [name, ok] of checks) {
  if (!ok) {
    failed++
    console.log(`FAIL ${name}`)
  }
}

console.log(failed ? `\n${failed} check(s) failed` : `All ${checks.length} job-description checks passed`)
process.exit(failed ? 1 : 0)
