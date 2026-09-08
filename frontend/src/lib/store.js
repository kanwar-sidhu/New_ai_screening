/**
 * Persistence. Job roles and the trash are rows in SQLite, held by the local
 * service (see backend/db.py); this file is the portal's side of that.
 *
 * It used to be one JSON string in `localStorage`, which made a cleared cache a
 * deleted database and put the whole dataset behind a key no query could reach.
 * The shape the app renders from has not changed — `loadState` still hands back
 * one object with the same fields — only where it comes from, and the fact that
 * getting it now takes a moment and can fail.
 *
 * Anything saved before the move is imported once, on the first load that finds
 * an empty database. That is the only thing `localStorage` is still read for.
 */

import { getJson, sendJson } from './api.js'

const LEGACY_KEY = 'screener.v1'
const IMPORTED_KEY = 'screener.imported'

export const RETENTION_DAYS = 15
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

/* ---------------- state ---------------- */

export const emptyState = {
  roles: [],
  trash: [],
  counters: { role: 0 },
}

/**
 * Two openings can share a title, so every role also carries a number that is
 * never reused — shown as JR-001. The counter only ever goes up, which is why
 * it is stored rather than derived from the current list.
 */
export const formatRoleCode = (codeNo) =>
  codeNo ? `JR-${String(codeNo).padStart(3, '0')}` : 'JR-—'

/**
 * Fills in whatever a saved shape is missing.
 *
 * The service answers with the shape below already, so this is mostly for the
 * legacy import — a save made before the trash existed simply has no entries,
 * and every screen expects the arrays to be there.
 */
function normalize(parsed) {
  const roles = parsed.roles || []
  // Older saves also kept resume entries in the trash; only roles matter now.
  const trash = (parsed.trash || []).filter((e) => e.kind === 'role' && e.role)

  // Roles saved before codes existed get one now, carrying on from the highest
  // number already in use so nothing collides.
  let seq = parsed.counters?.role || 0
  for (const r of [...roles, ...trash.map((e) => e.role)]) {
    if (Number.isFinite(r.codeNo)) seq = Math.max(seq, r.codeNo)
  }
  const number = (r) => (Number.isFinite(r.codeNo) ? r : { ...r, codeNo: ++seq })

  return {
    roles: roles.map(number),
    trash: trash.map((e) => ({ ...e, role: number(e.role) })),
    counters: { role: seq },
  }
}

/**
 * The dataset, from the service.
 *
 * Throws when the service is not running. That is deliberate: an empty screen
 * and a screen whose database could not be reached must never look the same,
 * and only the caller knows which message belongs on it.
 */
export async function loadState() {
  const state = normalize(await getJson('/api/state'))
  const imported = await importLegacy(state)
  return imported || state
}

export async function saveState(state) {
  await sendJson('/api/state', state)
}

/* ---------------- the one-time import ---------------- */

/** Whatever the browser was holding before the service existed. */
function readLegacy() {
  try {
    if (localStorage.getItem(IMPORTED_KEY)) return null
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return null
    const parsed = normalize(JSON.parse(raw))
    return parsed.roles.length || parsed.trash.length ? parsed : null
  } catch (err) {
    console.warn('the old saved state could not be read', err)
    return null
  }
}

/**
 * Moves a pre-SQLite save into the database, once.
 *
 * Only ever into an *empty* database — a service that already has rows is the
 * newer truth, and overwriting it with a stale browser copy would be the worst
 * thing this file could do. The old key is left where it is and simply marked
 * as done, so the import is recoverable if something about it was wrong.
 */
async function importLegacy(current) {
  if (current.roles.length || current.trash.length) return null

  const legacy = readLegacy()
  if (!legacy) return null

  await saveState(legacy)
  try {
    localStorage.setItem(IMPORTED_KEY, String(Date.now()))
  } catch {
    /* a browser that will not remember this simply re-imports into an empty database */
  }
  console.info('imported the previously saved roles into the database')
  return legacy
}

/* ---------------- trash helpers ---------------- */

/** When a trashed entry drops out on its own. Internal — read it through the two below. */
const expiresAt = (entry) => entry.deletedAt + RETENTION_MS

/** Whole days remaining, floored at zero — the "12d left" on a trash row. */
export function daysLeft(entry) {
  return Math.max(0, Math.ceil((expiresAt(entry) - Date.now()) / (24 * 60 * 60 * 1000)))
}

export const isExpired = (entry) => expiresAt(entry) <= Date.now()
