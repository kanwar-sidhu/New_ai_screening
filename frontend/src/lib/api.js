/**
 * The one address the portal knows.
 *
 * Everything that outlives a refresh now lives behind the local service: the
 * dataset in SQLite, the recordings as files on that machine's disk. The
 * browser keeps no copy — `localStorage` held the lot until this, which meant a
 * cleared cache was a deleted database and two tabs were two different truths.
 *
 * The service is still something the recruiter starts on their own machine and
 * still binds to loopback, so nothing here leaves the desk. Its being down is
 * an ordinary state rather than a crash, and every caller is expected to say so
 * plainly — see `describeError`.
 */

const DEFAULT_BASE = 'http://127.0.0.1:8765'

/** Where the service is. Set VITE_ANALYZER_URL to move it. */
export const baseUrl = () =>
  (import.meta.env?.VITE_ANALYZER_URL || DEFAULT_BASE).replace(/\/+$/, '')

/** Reading or writing the dataset is text over a loopback socket — a slow one is a broken one. */
const TIMEOUT_MS = 30 * 1000

/** A clip is megabytes and the disk may be busy, so it gets longer. */
const CLIP_TIMEOUT_MS = 5 * 60 * 1000

/**
 * A fetch that gives up, and that never resolves to a half-read reply.
 *
 * `parse` decides what a success means: JSON for the dataset, a blob for a
 * clip. A failure is always JSON — the service answers `{ error }` — so the
 * message shown on screen is the service's own words rather than a status code.
 */
async function call(path, { method = 'GET', body, headers, signal, timeout = TIMEOUT_MS, parse = 'json' } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort)

  try {
    const res = await fetch(`${baseUrl()}${path}`, {
      method,
      body,
      headers,
      signal: controller.signal,
    })

    if (!res.ok) {
      let message = `the service returned ${res.status}`
      try {
        const data = await res.json()
        if (data?.error) message = data.error
      } catch {
        /* a non-JSON body means something other than the service answered */
      }
      const err = new Error(message)
      err.status = res.status
      throw err
    }

    if (parse === 'blob') return res.blob()
    if (parse === 'none') return null
    return res.json()
  } catch (err) {
    // an abort that was ours is a timeout; an abort from the caller is a cancel
    if (err?.name === 'AbortError' && !signal?.aborted)
      throw new Error('the service took too long and the request was dropped')
    throw err
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

export const getJson = (path, options) => call(path, options)

export const sendJson = (path, payload, { method = 'PUT', ...options } = {}) =>
  call(path, {
    ...options,
    method,
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

export const getBlob = (path, options) =>
  call(path, { ...options, parse: 'blob', timeout: CLIP_TIMEOUT_MS })

export const sendBytes = (path, blob, options) =>
  call(path, {
    ...options,
    method: 'POST',
    body: blob,
    headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    timeout: CLIP_TIMEOUT_MS,
  })

/**
 * What to put on screen when the service cannot be reached.
 *
 * "Failed to fetch" is what the browser says and it tells a recruiter nothing;
 * the one thing worth saying is the command that fixes it.
 */
export function describeError(err) {
  const message = err?.message || 'the service could not be reached'
  if (/fetch|network|reached/i.test(message))
    return 'The Screener service is not running, so there is nothing to read from or save to.'
  return message
}
