import { useCallback, useEffect, useRef, useState } from 'react'
import Shell from './components/Shell.jsx'
import Home from './components/Home.jsx'
import RoleForm from './components/RoleForm.jsx'
import RoleWorkspace from './components/RoleWorkspace.jsx'
import Trash from './components/Trash.jsx'
import { emptyState, isExpired, loadState, saveState } from './lib/store.js'
import { describeError } from './lib/api.js'

const nextId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

const PURGE_INTERVAL = 60 * 60 * 1000 // re-check hourly for long-lived tabs

/*
 * How long after a change the dataset is written back.
 *
 * Every edit used to be a synchronous `localStorage` write, which cost nothing.
 * A save is now a request, and typing in a form is a dozen state changes a
 * second, so they are collected: the last change wins and one write goes out.
 * Short enough that a closed tab has already saved, long enough that a keystroke
 * is not a round trip.
 */
const SAVE_DEBOUNCE_MS = 400

/** A readable address for a view — the state object is what actually restores it. */
const viewHash = (view) => (view.id ? `${view.name}/${view.id}` : view.name)

export default function App() {
  // view: { name: 'home' | 'new' | 'trash' } | { name: 'role', id }
  // a reload lands back on the screen the address bar is showing
  const [view, setView] = useState(() => window.history.state?.view || { name: 'home' })

  // The dataset is not in this tab any more — it is read from the service on
  // startup, so there is a moment before there is anything to render, and a
  // reason to show when there never will be.
  const [state, setState] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  // what came back from the service, so the first render after a load does not
  // immediately write it straight back
  const loaded = useRef(null)

  useEffect(() => {
    let live = true
    setLoadError(null)
    loadState().then(
      (state) => {
        if (!live) return
        loaded.current = state
        setState(state)
      },
      (err) => live && setLoadError(describeError(err)),
    )
    return () => {
      live = false
    }
  }, [attempt])

  /*
   * Writing it back.
   *
   * Debounced, and skipped entirely until the first load has landed — saving
   * before then would write an empty dataset over a full one. A failed write is
   * kept on screen rather than logged and forgotten: the edit is still in this
   * tab, and the recruiter is the only one who can tell whether that matters.
   */
  useEffect(() => {
    if (!state || state === loaded.current) return
    const timer = setTimeout(() => {
      saveState(state).then(
        () => setSaveError(null),
        (err) => setSaveError(describeError(err)),
      )
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [state])

  const { roles, trash } = state || emptyState

  /*
   * Every screen is an entry in the browser's history, so the toolbar's back and
   * forward arrows walk the app the same way its own buttons do. The current
   * view is mirrored into history.state; a view that already matches it came
   * from an arrow press, so it is not pushed again.
   */
  useEffect(() => {
    const onPop = (e) => setView(e.state?.view || { name: 'home' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const current = window.history.state?.view
    if (JSON.stringify(current) === JSON.stringify(view)) return
    const method = current ? 'pushState' : 'replaceState'
    window.history[method]({ view }, '', `#${viewHash(view)}`)
  }, [view])

  /** Drop trash entries past the retention window. */
  const purgeExpired = useCallback(() => {
    setState((prev) => {
      if (!prev) return prev
      if (!prev.trash.some(isExpired)) return prev
      return { ...prev, trash: prev.trash.filter((e) => !isExpired(e)) }
    })
  }, [])

  useEffect(() => {
    purgeExpired()
    const timer = setInterval(purgeExpired, PURGE_INTERVAL)
    return () => clearInterval(timer)
  }, [purgeExpired])

  const role = view.name === 'role' ? roles.find((r) => r.id === view.id) : null

  // Going back to a role that has since been deleted would show an empty
  // screen, so those entries fall through to the role list.
  useEffect(() => {
    if (!view.id || roles.some((r) => r.id === view.id)) return
    setView({ name: 'home' })
  }, [view, roles])

  /* ---------------- roles ---------------- */

  function createRole(draft) {
    const id = nextId('r')
    setState((prev) => {
      // the code counter only moves forward, so a deleted role never hands its
      // number to the next opening
      const codeNo = prev.counters.role + 1
      const created = { ...draft, id, codeNo, createdAt: Date.now() }
      return {
        ...prev,
        roles: [created, ...prev.roles],
        counters: { ...prev.counters, role: codeNo },
      }
    })
    setView({ name: 'role', id })
  }

  function updateRole(id, patch) {
    setState((prev) => ({
      ...prev,
      roles: prev.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }

  /** Deleted roles go to the trash, so a mis-click is recoverable. */
  function deleteRole(id) {
    setState((prev) => {
      const target = prev.roles.find((r) => r.id === id)
      if (!target) return prev
      return {
        ...prev,
        roles: prev.roles.filter((r) => r.id !== id),
        trash: [
          { id: nextId('t'), kind: 'role', deletedAt: Date.now(), role: target },
          ...prev.trash,
        ],
      }
    })
    setView({ name: 'home' })
  }

  /* ---------------- trash ---------------- */

  function restore(entryId) {
    setState((prev) => {
      const entry = prev.trash.find((e) => e.id === entryId)
      if (!entry) return prev
      return {
        ...prev,
        roles: [entry.role, ...prev.roles],
        trash: prev.trash.filter((e) => e.id !== entryId),
      }
    })
  }

  function purge(entryIds) {
    setState((prev) => ({
      ...prev,
      trash: prev.trash.filter((e) => !entryIds.includes(e.id)),
    }))
  }

  /* ---------------- render ---------------- */

  // Nothing is drawn until the dataset is in hand. A portal that renders "no job
  // roles yet" while the database is simply unreachable is a portal that tells
  // the recruiter their work is gone.
  if (!state) return <Startup error={loadError} onRetry={() => setAttempt((n) => n + 1)} />

  return (
    <Shell
      view={view}
      roles={roles}
      trashCount={trash.length}
      onHome={() => setView({ name: 'home' })}
      onTrash={() => setView({ name: 'trash' })}
    >
      {saveError && (
        <p className="store-warning" role="status">
          <b>Not saved.</b> {saveError} Your last change is still on this screen — it will be
          written as soon as the service is back.
        </p>
      )}

      {view.name === 'home' && (
        <Home
          roles={roles}
          onAdd={() => setView({ name: 'new' })}
          onOpen={(id) => setView({ name: 'role', id })}
        />
      )}

      {view.name === 'new' && (
        <RoleForm onCancel={() => setView({ name: 'home' })} onSave={createRole} />
      )}

      {view.name === 'trash' && (
        <Trash
          entries={trash}
          onRestore={restore}
          onPurge={(id) => purge([id])}
          onEmpty={() => purge(trash.map((e) => e.id))}
        />
      )}

      {view.name === 'role' && role && (
        <RoleWorkspace
          role={role}
          onBack={() => setView({ name: 'home' })}
          onEditRole={(patch) => updateRole(role.id, patch)}
          onDeleteRole={() => deleteRole(role.id)}
        />
      )}
    </Shell>
  )
}

/**
 * The screen before the screens.
 *
 * The dataset lives in the service now, so the portal has a moment where it has
 * nothing — and, if the service is not started, a state where it never will.
 * Both are shown here rather than as an empty dashboard, and the failing one
 * carries the command that fixes it, because "start the service" is the entire
 * remedy and there is no reason to make anyone go and look it up.
 */
function Startup({ error, onRetry }) {
  return (
    <div className="startup">
      <div className="startup-card">
        <span className="brand-mark">AI</span>
        {!error ? (
          <>
            <h1>Opening your workspace…</h1>
            <p className="sub">Reading the job roles.</p>
          </>
        ) : (
          <>
            <h1>Can’t reach your data</h1>
            <p className="sub">{error}</p>
            <p className="sub">Start it from the project folder, then try again:</p>
            <code className="startup-cmd">backend\.venv\Scripts\python.exe backend\server.py</code>
            <button className="btn btn-primary" type="button" onClick={onRetry}>
              Try again
            </button>
            <p className="startup-note">
              Nothing is lost while it is down — the roles are rows in a file on this machine,
              under <code>backend/data/</code>.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
