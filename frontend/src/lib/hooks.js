/**
 * The effects that were written out by hand in more than one screen.
 *
 * Nothing here is clever. They are here because five components had the same
 * eight lines in them, and eight lines copied five times is five places to fix
 * when the behaviour turns out to be subtly wrong in one of them.
 */

import { useEffect } from 'react'

/**
 * Escape closes it.
 *
 * Every popup in the portal — the delete confirmations, the save previews, the
 * clip player — can be backed out of with the keyboard as well as with its own
 * Cancel button. A dialog that can only be left by finding the right button is
 * a dialog that traps anyone not using a mouse.
 *
 * `active` is what gates the listener: a popup that is not on screen must not
 * be swallowing Escape from whatever is.
 */
export function useEscape(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onEscape])
}
