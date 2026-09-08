/**
 * Presentation helpers — values in, the strings on screen out.
 *
 * Every one of these was written more than once across the screens before it
 * landed here: the same two-letter monogram in five card lists, the same
 * date-and-time stamp in six, the same clock in two. One copy means a role
 * looks alike wherever it appears, and changing how a date reads is one edit
 * rather than six that drift apart.
 *
 * Nothing here touches state, the network or React — input to string, always.
 * The one formatter that is *not* here is `duration` in assessment.js: that one
 * reads a question's timer back in the words the recruiter typed it in, so it
 * belongs to the interview model rather than to generic presentation.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/* ---------------- names ---------------- */

/**
 * "Senior Frontend Engineer" → "SE".
 *
 * A stable visual anchor on a role's card. First and last word rather than the
 * first two, so "Engineer, Frontend (Senior)" and "Senior Frontend Engineer"
 * do not read as different jobs.
 */
export function initials(title = '') {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/* ---------------- dates ---------------- */

/*
 * The formatters are built once, at module load. Constructing an
 * Intl.DateTimeFormat is expensive enough to matter inside a list that
 * re-renders, and none of these ever change. `undefined` as the locale means
 * "whatever this machine is set to" — a recruiter in Bengaluru and one in
 * Berlin each read their own convention without the app choosing for them.
 */

const DATE = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const TIME = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const FULL = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const SHORT = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

/** "5 Jan 2026" — a date on its own. */
export const day = (ts) => DATE.format(ts)

/** "3:04 pm" — a time on its own. */
export const time = (ts) => TIME.format(ts)

/** "5 Jan 2026, 3:04 pm" — the stamp under every card. */
export const stamp = (ts) => FULL.format(ts)

/**
 * "5 Jan, 3:04 pm" — the same stamp where the year is noise.
 *
 * Used on the "saved just now" line of an editor, which is almost always
 * today: printing the year there is four characters that say nothing.
 */
export const shortStamp = (ts) => SHORT.format(ts)

/**
 * "3d ago" — recency beside an absolute stamp, never instead of one.
 *
 * The absolute date is what a recruiter quotes in an email; this is what tells
 * them at a glance which card is the new one.
 */
export function relative(ts) {
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`

  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`

  const days = Math.round(hrs / 24)
  if (days < 7) return `${days}d ago`

  const weeks = Math.round(days / 7)
  if (weeks < 5) return `${weeks}w ago`

  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`

  return `${Math.round(days / 365)}y ago`
}

/** "today" · "yesterday" · "4 days ago" — for the trash, where the day is the point. */
export function daysAgo(ts) {
  const days = Math.floor((Date.now() - ts) / DAY_MS)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

/* ---------------- times and sizes ---------------- */

/**
 * "1:04" — a position inside a recording.
 *
 * Beside a transcript line, on a flagged moment, at either end of the
 * timeline strip. Unpadded minutes, because these are read as prose.
 */
export function clock(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * "01:04" — a timer counting down.
 *
 * Padded, unlike `clock`, because this one is watched rather than read: a
 * figure that changes width as it passes 10:00 twitches on the screen.
 */
export function countdown(seconds) {
  const s = Math.max(0, seconds)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

/** "4.2 MB" — the size shown beside each stored clip. */
export function fileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "0%" – "100%" — every share the analysis reports. */
export const percent = (share) => `${Math.round((share || 0) * 100)}%`
