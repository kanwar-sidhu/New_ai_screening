/**
 * The pieces of markup that were written out once per screen.
 *
 * The list screens draw the same empty state and the same confirm popup. They
 * were copies — near-identical, but only near, which is how one popup ends up
 * being the only one you cannot close with Escape.
 *
 * Each of these owns its own class names, so the stylesheet keeps working
 * unchanged and there is exactly one place to edit when it should not.
 */

import { useEscape } from '../lib/hooks.js'

/**
 * A screen with nothing on it yet, and the one thing to do about that.
 *
 * Always a reason and usually a way out: "no roles" on its own leaves a
 * recruiter guessing whether something is broken. `action` is a button rather
 * than a prop pair because half these screens send you somewhere else and half
 * open something here.
 */
export function EmptyState({ icon, title, children, action }) {
  return (
    <div className="home-empty">
      <span className="home-empty-icon">{icon}</span>
      <p className="home-empty-title">{title}</p>
      {children && <p className="home-empty-sub">{children}</p>}
      {action}
    </div>
  )
}

/**
 * A popup that can always be left.
 *
 * Three ways out, and every dialog in the portal gets all three: its own
 * button, a click on the backdrop, and Escape. The backdrop check is against
 * `currentTarget` so a click that started inside the card and drifted out does
 * not close it mid-sentence.
 *
 * `className` is the card's own styling — the popups differ in what they hold,
 * and that is the only way they differ.
 */
export function Modal({ labelledBy, className = 'panel confirm-card', onClose, children }) {
  useEscape(true, onClose)

  return (
    <div
      className="tpl-confirm-back"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={className} role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  )
}
