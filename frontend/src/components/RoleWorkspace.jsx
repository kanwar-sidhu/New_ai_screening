import { useCallback, useRef, useState } from 'react'
import RoleForm, { isHeading } from './RoleForm.jsx'
import { formatRoleCode } from '../lib/store.js'
import { day } from '../lib/format.js'
import { DocIcon, TrashIcon } from './icons.jsx'
import { Modal } from './ui.jsx'

/**
 * One opening, read back.
 *
 * Everything the job description was read into — the facts, the three skill
 * lists and the description itself — with the two things that can be done to
 * it: edit it, or move it to the trash.
 */
export default function RoleWorkspace({ role, onBack, onEditRole, onDeleteRole }) {
  const [editing, setEditing] = useState(false)
  // Deleting is one click away from the header, so it is confirmed first.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // "View details" jumps to the panel further down rather than opening a screen,
  // since the details are already on this page.
  const detailsRef = useRef(null)
  const showDetails = () => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // stable identity: the popup subscribes to Escape with it
  const closeConfirm = useCallback(() => setConfirmingDelete(false), [])

  if (editing) {
    return (
      <RoleForm
        initial={role}
        onCancel={() => setEditing(false)}
        onSave={(patch) => {
          onEditRole(patch)
          setEditing(false)
        }}
      />
    )
  }

  const meta = [role.department, role.location, role.employmentType, role.experience]
    .filter(Boolean)
    .join(' · ')

  const parse = (value) =>
    (value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  // Roles saved before the split lists existed only carry `skills` — show those
  // as must-haves rather than dropping them.
  const skillGroups = [
    {
      tone: 'must',
      label: 'Must-have skills',
      note: 'Required',
      items: parse(role.mustSkills || role.skills),
    },
    { tone: 'good', label: 'Good-to-have skills', note: 'Bonus', items: parse(role.goodSkills) },
    { tone: 'pref', label: 'Preferred skills', note: 'Tie-breaker', items: parse(role.preferredSkills) },
  ]

  // Every field gets a row, filled in or not, so the panel reads the same way
  // for a sparse role as for a fully described one.
  const facts = [
    { label: 'Department', value: role.department },
    { label: 'Location', value: role.location },
    { label: 'Employment type', value: role.employmentType },
    { label: 'Experience', value: role.experience },
    { label: 'Created', value: role.createdAt ? day(role.createdAt) : '' },
  ]

  const skillCount = skillGroups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="page">
      <div className="sheet sheet-full">
        <header className="role-header">
          <div className="head-title">
            <button className="back" type="button" onClick={onBack} title="Back">
              ←
            </button>
            <div>
              <h1>{role.title}</h1>
              <p className="sub">
                <span className="role-code">{formatRoleCode(role.codeNo)}</span>
                {meta}
              </p>
            </div>
          </div>
          <div className="head-actions">
            <button
              className="btn btn-danger"
              type="button"
              onClick={() => setConfirmingDelete(true)}
              title="Moves the job role to the trash"
            >
              Delete
            </button>
          </div>
        </header>

        {/* What the description was read into, summarised — the panel below is
            the same information in full. */}
        <section className="panel track-panel">
          <header className="panel-head">
            <div className="panel-title">
              <p className="list-label">Job details</p>
              <p className="sub">Read out of the description when this role was created.</p>
            </div>
          </header>

          <ul className="track-stages">
            <li className="track-stage is-done">
              <span className="track-icon" aria-hidden="true">
                <DocIcon />
              </span>
              <span className="track-text">
                <span className="track-label">Job details</span>
                <span className="track-detail">
                  {skillCount} skills listed ·{' '}
                  {role.description ? 'description added' : 'no description'}
                </span>
              </span>
              <span className="track-badge is-done">Saved</span>
              <span className="track-actions">
                <button className="btn btn-sm track-btn btn-cancel" type="button" onClick={showDetails}>
                  View details
                </button>
                <button
                  className="btn btn-sm track-btn btn-outline-primary"
                  type="button"
                  onClick={() => setEditing(true)}
                >
                  Edit details
                </button>
              </span>
            </li>
          </ul>
        </section>

        <section className="panel jd-panel" ref={detailsRef}>
          <header className="panel-head">
            <div className="panel-title">
              <p className="list-label">Role details</p>
              <p className="sub">Everything saved for this opening.</p>
            </div>
            <button className="btn" type="button" onClick={() => setEditing(true)}>
              Edit details
            </button>
          </header>

          <dl className="jd-facts">
            {facts.map((f) => (
              <div className="jd-fact" key={f.label}>
                <dt>{f.label}</dt>
                <dd className={f.value ? '' : 'jd-blank'}>{f.value || 'Not specified'}</dd>
              </div>
            ))}
          </dl>

          <div className="skill-groups">
            {skillGroups.map((g) => (
              <div className={`skill-group skill-${g.tone}`} key={g.tone}>
                <p className="skill-group-head">
                  <span className={`tone-dot tone-${g.tone}`} aria-hidden="true" />
                  <span className="skill-group-label">{g.label}</span>
                  <span className="skill-group-note">{g.note}</span>
                </p>
                {g.items.length > 0 ? (
                  <div className="chips">
                    {g.items.map((s, i) => (
                      <span className={`chip chip-${g.tone}`} key={`${s}-${i}`}>
                        {s}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="jd-blank">None added yet.</p>
                )}
              </div>
            ))}
          </div>

          <div className="jd-block">
            <p className="jd-block-label">Full job description</p>
            {role.description ? (
              <div className="jd-text">
                {role.description.split('\n').map((line, i) => (
                  <div key={i} className={isHeading(line) ? 'jd-line jd-head' : 'jd-line'}>
                    {line || ' '}
                  </div>
                ))}
              </div>
            ) : (
              <p className="jd-blank">No description added yet.</p>
            )}
          </div>
        </section>
      </div>

      {/* Deleting is recoverable — the popup says so, so the choice is informed. */}
      {confirmingDelete && (
        <Modal labelledBy="del-confirm-title" onClose={closeConfirm}>
          <span className="confirm-icon" aria-hidden="true">
            <TrashIcon />
          </span>
          <p className="confirm-title" id="del-confirm-title">
            Delete this job role?
          </p>
          <p className="confirm-text">
            <b>{role.title}</b> ({formatRoleCode(role.codeNo)}) moves to the trash, along with
            everything saved for it. You can restore it from there.
          </p>
          <footer className="confirm-actions">
            <button className="btn btn-cancel" type="button" onClick={closeConfirm}>
              Cancel
            </button>
            <button className="btn btn-danger" type="button" onClick={onDeleteRole}>
              Delete job role
            </button>
          </footer>
        </Modal>
      )}
    </div>
  )
}
