import { useMemo, useRef, useState } from 'react'
import { InfoIcon } from './icons.jsx'
import { emptyFields, parseJd } from '../lib/jd.js'

/** A description line is a heading when it has text and ends with a colon. */
export const isHeading = (line) => /^\s*\S.*:\s*$/.test(line)

/**
 * Older roles kept a single `skills` string. Those become the must-have list so
 * nothing is lost when an existing role is edited.
 */
function fromRole(initial) {
  if (!initial) return { ...emptyFields, description: '', skills: '' }
  const fields = { ...emptyFields, ...initial }
  if (!initial.mustSkills && initial.skills) fields.mustSkills = initial.skills
  return fields
}

/** The extracted skill lists, in the order they are weighted during screening. */
const SKILL_GROUPS = [
  { key: 'mustSkills', tone: 'must', label: 'Must-have skills', note: 'Required' },
  { key: 'goodSkills', tone: 'good', label: 'Good-to-have skills', note: 'Bonus' },
  { key: 'preferredSkills', tone: 'pref', label: 'Preferred skills', note: 'Tie-breaker' },
]

const FACTS = [
  { key: 'title', label: 'Job title' },
  { key: 'department', label: 'Department' },
  { key: 'location', label: 'Location' },
  { key: 'employmentType', label: 'Employment type' },
  { key: 'experience', label: 'Experience' },
]

const asList = (value) =>
  (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

/**
 * Creating a role from the job description itself.
 *
 * There is one input on this screen: the JD, pasted whole. Everything the role
 * is saved with — title, department, location, employment type, experience and
 * the three skill lists — is read back out of that text as it is typed, and
 * shown alongside it so what will be saved is never a surprise. The fields are
 * not typed in one at a time any more, because the recruiter already wrote them
 * down once in the description.
 */
export default function RoleForm({ onSave, onCancel, initial }) {
  // An edit opens on the JD that was saved; a role saved before this screen
  // existed may have no description, and then its stored fields are what shows
  // until something is pasted over them.
  const [text, setText] = useState(() => initial?.description || '')
  const [showTip, setShowTip] = useState(false)
  const mirrorRef = useRef(null)

  const draft = useMemo(
    () => (text.trim() ? parseJd(text) : fromRole(initial)),
    [text, initial]
  )

  const found = FACTS.filter((f) => draft[f.key]).length
  const skillCount = SKILL_GROUPS.reduce((n, g) => n + asList(draft[g.key]).length, 0)

  /** Keep the heading overlay lined up with the textarea while it scrolls. */
  const syncScroll = (e) => {
    if (mirrorRef.current) mirrorRef.current.scrollTop = e.target.scrollTop
  }

  function submit(e) {
    e.preventDefault()
    if (!draft.title.trim()) return
    onSave({ ...draft, title: draft.title.trim() })
  }

  return (
    <div className="page form-page">
      <form className="sheet form-sheet" onSubmit={submit}>
        <header className="sheet-head form-head">
          <div className="home-head-text">
            <h1 className="form-title">{initial ? 'Edit job role' : 'Create a new job role'}</h1>
            <p className="sub form-sub">
              {initial
                ? 'Paste an updated job description — resumes already screened stay attached.'
                : 'Paste the full job description. Every field is read out of it for you.'}
            </p>
          </div>
          <div className="head-actions">
            <button className="btn btn-cancel" type="button" onClick={onCancel}>
              Cancel
            </button>
            <button
              className={`btn ${initial ? 'btn-primary' : 'btn-success'}`}
              type="submit"
              disabled={!draft.title.trim()}
              title={draft.title.trim() ? '' : 'Paste a job description first'}
            >
              {initial ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </header>

        <div className="form-grid">
          {/* ---------------- left: the one thing to fill in ---------------- */}
          <section className="panel panel-form form-card">
            <header className="form-card-head">
              <p className="form-section-label">Job description</p>
              <p className="form-card-sub">
                Paste it whole — formatting is ignored, and screening matches resumes against this
                text.
              </p>
            </header>

            <div className="form-card-body form-card-body-fill">
              <div className="field field-fill">
                <span className="field-label-row">
                  Full job description<i className="req">*</i>
                  <button
                    type="button"
                    className={`info-btn ${showTip ? 'is-on' : ''}`}
                    aria-expanded={showTip}
                    aria-label="How the details are read"
                    onClick={() => setShowTip((v) => !v)}
                  >
                    <InfoIcon />
                  </button>
                </span>

                {showTip && (
                  <p className="field-tip" role="note">
                    Labelled lines read best — <b>Location: Bengaluru</b>, <b>Experience: 3–6
                    years</b> — and a heading such as <b>Must-have skills:</b> turns the bullets
                    under it into that list.
                  </p>
                )}

                <div className="jd-editor">
                  {/* headings are painted behind the textarea, which keeps only its caret */}
                  <div className="jd-mirror" ref={mirrorRef} aria-hidden="true">
                    {text.split('\n').map((line, i) => (
                      <div key={i} className={isHeading(line) ? 'jd-line jd-head' : 'jd-line'}>
                        {line || ' '}
                      </div>
                    ))}
                  </div>
                  <textarea
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onScroll={syncScroll}
                    spellCheck="false"
                    aria-label="Full job description"
                    placeholder={
                      'Senior Frontend Engineer\n' +
                      'Department: Engineering\n' +
                      'Location: Bengaluru / Remote\n' +
                      'Employment type: Full-time\n' +
                      'Experience: 3–6 years\n\n' +
                      'Must-have skills:\n· React, TypeScript, REST APIs\n\n' +
                      'Good-to-have skills:\n· GraphQL, CI/CD\n\n' +
                      'Responsibilities:\n· …'
                    }
                  />
                </div>
              </div>
            </div>
          </section>

          {/* ---------------- right: what was read out of it ---------------- */}
          <section className="panel panel-form form-card">
            <header className="form-card-head tpl-card-head">
              <div>
                <p className="form-section-label">Extracted details</p>
                <p className="form-card-sub">
                  Filled in automatically as you paste — this is exactly what gets saved.
                </p>
              </div>
              <span className={`as-badge${found === FACTS.length ? ' is-ready' : ''}`}>
                {found}/{FACTS.length} found
              </span>
            </header>

            <div className="form-card-body">
              {!text.trim() && !initial ? (
                <p className="as-blank">
                  Nothing read yet — paste the job description on the left and the fields fill
                  themselves in here.
                </p>
              ) : (
                <>
                  <dl className="jd-facts">
                    {FACTS.map((f) => (
                      <div className="jd-fact" key={f.key}>
                        <dt>{f.label}</dt>
                        <dd className={draft[f.key] ? '' : 'jd-blank'}>
                          {draft[f.key] || 'Not found in the description'}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <div className="skill-groups">
                    {SKILL_GROUPS.map((g) => {
                      const items = asList(draft[g.key])
                      return (
                        <div className={`skill-group skill-${g.tone}`} key={g.key}>
                          <p className="skill-group-head">
                            <span className={`tone-dot tone-${g.tone}`} aria-hidden="true" />
                            <span className="skill-group-label">{g.label}</span>
                            <span className="skill-group-note">
                              {items.length > 0 ? `${items.length} · ${g.note}` : g.note}
                            </span>
                          </p>
                          {items.length > 0 ? (
                            <div className="chips">
                              {items.map((s, i) => (
                                <span className={`chip chip-${g.tone}`} key={`${s}-${i}`}>
                                  {s}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="jd-blank">None found in the description.</p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <p className="form-hint">
                    {draft.title.trim() ? (
                      <>
                        <b>{skillCount} skills</b> read from the description. Anything missing is
                        usually a line the JD does not have — add it to the text and it appears
                        here.
                      </>
                    ) : (
                      <>
                        <b>No job title yet.</b> The first line of the description is taken as the
                        title, and a role cannot be saved without one.
                      </>
                    )}
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </form>
    </div>
  )
}
