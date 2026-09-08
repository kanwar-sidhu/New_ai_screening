import { RETENTION_DAYS, daysLeft, formatRoleCode } from '../lib/store.js'
import { daysAgo } from '../lib/format.js'

export default function Trash({ entries, onRestore, onPurge, onEmpty }) {
  return (
    <div className="page">
      <div className="sheet sheet-wide">
        <header className="sheet-head">
          <div>
            <h1>Trash</h1>
            <p className="sub">
              Deleted job roles are kept for {RETENTION_DAYS} days, then removed automatically.
            </p>
          </div>
          {entries.length > 0 && (
            <button className="btn btn-outline-danger" type="button" onClick={onEmpty}>
              Empty trash
            </button>
          )}
        </header>

        {entries.length === 0 ? (
          <section className="panel">
            <p className="list-empty">Trash is empty.</p>
          </section>
        ) : (
          <ul className="role-list panel">
            {entries.map((entry) => {
              const left = daysLeft(entry)
              return (
                <li key={entry.id} className="trash-item">
                  <div className="role-main">
                    <span className="role-title">{entry.role.title}</span>
                    <span className="role-meta">
                      <span className="role-code">{formatRoleCode(entry.role.codeNo)}</span>
                      deleted {daysAgo(entry.deletedAt)}
                    </span>
                  </div>
                  <div className="trash-right">
                    <span className={`role-count${left <= 3 ? ' is-soon' : ''}`}>
                      {left === 0 ? 'deletes today' : `${left}d left`}
                    </span>
                    <button
                      className="btn btn-sm btn-outline-primary"
                      type="button"
                      onClick={() => onRestore(entry.id)}
                    >
                      Restore
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      type="button"
                      onClick={() => onPurge(entry.id)}
                    >
                      Delete now
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
