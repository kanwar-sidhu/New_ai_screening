import { useMemo, useState } from 'react'
import {
  PlusIcon,
  RolesIcon,
  InfoIcon,
  DeptIcon,
  PinIcon,
  ClockIcon,
  CalendarIcon,
  DocIcon,
} from './icons'
import { EmptyState } from './ui.jsx'
import { formatRoleCode } from '../lib/store.js'
import { day, initials, relative, time } from '../lib/format.js'

// Each fact carries its own icon + label so a bare value like "Contract"
// can't be mistaken for a department or a location.
function factsFor(role) {
  return [
    { key: 'dept', label: 'Department', value: role.department, Icon: DeptIcon },
    { key: 'loc', label: 'Location', value: role.location, Icon: PinIcon },
    { key: 'type', label: 'Employment type', value: role.employmentType, Icon: ClockIcon },
    { key: 'exp', label: 'Experience', value: role.experience, Icon: DocIcon },
    { key: 'skills', label: 'Key skills', value: role.skills, Icon: RolesIcon },
  ].filter((f) => f.value && String(f.value).trim())
}

export default function Home({ roles, onAdd, onOpen }) {
  // Newest role on top, whatever order they happen to sit in storage.
  const ordered = useMemo(
    () => [...roles].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)),
    [roles]
  )

  // Details stay folded away until the info button is pressed; several cards
  // can be open at once, so this is a set of ids rather than a single one.
  const [expanded, setExpanded] = useState(() => new Set())
  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="page page-home">
      <div className="sheet sheet-home">
        {/* header + counts stay put; only the role list below scrolls */}
        <div className="home-top">
          <header className="sheet-head home-head">
            <div className="home-head-text">
              <h1 className="home-title">Job roles</h1>
              <p className="sub home-sub">Add a job role and its description.</p>
            </div>
            <button className="btn btn-success btn-lg" type="button" onClick={onAdd}>
              <PlusIcon /> Add new job role
            </button>
          </header>

          <div className="home-panel-head">
            <p className="list-label home-list-label">
              All roles <span className="count home-count">{ordered.length}</span>
            </p>
          </div>
        </div>

        <section className="home-scroll">
          {ordered.length === 0 ? (
            <EmptyState
              icon={<RolesIcon />}
              title="No roles yet"
              action={
                <button className="btn btn-success" type="button" onClick={onAdd}>
                  <PlusIcon /> Add new job role
                </button>
              }
            >
              Create your first job role to get started.
            </EmptyState>
          ) : (
            <ul className="role-list home-cards">
              {ordered.map((role, i) => {
                const facts = factsFor(role)
                const created = role.createdAt ? new Date(role.createdAt) : null
                const isOpen = expanded.has(role.id)
                const detailsId = `role-details-${role.id}`

                return (
                  <li className="home-row" key={role.id}>
                    <span className="home-index" aria-hidden="true">
                      {i + 1}
                    </span>
                    <article className={`home-card${isOpen ? ' is-expanded' : ''}`}>
                      <div className="home-card-body">
                        <span className="home-avatar" aria-hidden="true">
                          {initials(role.title)}
                        </span>

                        <div className="home-card-main">
                          {/* the overlay on this button makes the whole card clickable */}
                          <button
                            className="home-card-open"
                            type="button"
                            onClick={() => onOpen(role.id)}
                          >
                            <span className="home-card-title" title={role.title}>
                              {role.title}
                            </span>
                          </button>
                          <p className="home-card-hint">
                            <span className="role-code">{formatRoleCode(role.codeNo)}</span>
                            {facts.length > 0
                              ? `${facts.length} ${facts.length === 1 ? 'detail' : 'details'} — tap the info button`
                              : 'No role details added yet'}
                          </p>
                        </div>

                        <div className="home-card-right">
                          <button
                            className={`home-info${isOpen ? ' is-on' : ''}`}
                            type="button"
                            onClick={() => toggle(role.id)}
                            aria-expanded={isOpen}
                            aria-controls={detailsId}
                            title={isOpen ? 'Hide role details' : 'Show role details'}
                          >
                            <InfoIcon />
                            <span className="sr-only">
                              {isOpen ? 'Hide' : 'Show'} details for {role.title}
                            </span>
                          </button>

                          <span className="home-chevron" aria-hidden="true">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M9 6l6 6-6 6" />
                            </svg>
                          </span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="home-details" id={detailsId}>
                          {facts.length > 0 ? (
                            <div className="home-facts">
                              {facts.map(({ key, label, value, Icon }) => (
                                <div className="home-fact" key={key}>
                                  <Icon />
                                  <div className="home-fact-text">
                                    <span className="home-fact-label">{label}</span>
                                    <span className="home-fact-value" title={value}>
                                      {value}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="home-facts-empty">
                              Nothing added yet — open the role to edit its details.
                            </p>
                          )}
                        </div>
                      )}

                      <div className="home-card-foot">
                        {created ? (
                          <>
                            <span className="home-stamp">
                              <CalendarIcon />
                              {day(created)}
                            </span>
                            <span className="home-stamp-dot" aria-hidden="true" />
                            <span className="home-stamp">
                              <ClockIcon />
                              {time(created)}
                            </span>
                            <span className="home-stamp-age">{relative(role.createdAt)}</span>
                          </>
                        ) : (
                          <span className="home-stamp">
                            <CalendarIcon />
                            Created date unavailable
                          </span>
                        )}
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
