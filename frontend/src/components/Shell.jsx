import { RolesIcon, TrashIcon } from './icons.jsx'

// The create-role form is opened from the job roles list rather than from the
// sidebar, so it keeps its parent highlighted.
const CHILDREN = {
  home: ['new'],
}

function isActive(itemName, viewName) {
  return itemName === viewName || (CHILDREN[itemName] || []).includes(viewName)
}

export default function Shell({ view, roles, trashCount, onHome, onTrash, children }) {
  const items = [
    { name: 'home', label: 'Job roles', icon: <RolesIcon />, count: roles.length, onClick: onHome },
    { name: 'trash', label: 'Trash', icon: <TrashIcon />, count: trashCount, onClick: onTrash },
  ]

  return (
    <div className="shell">
      <header className="navbar">
        <button className="brand" type="button" onClick={onHome}>
          <span className="brand-mark">AI</span>
          <span className="brand-name">AI Interview Screening Portal</span>
        </button>

        <div className="navbar-right">
          <span className="portal">Recruitment Portal</span>
        </div>
      </header>

      <div className="body">
        <aside className="sidebar">
          <nav className="nav">
            {items.map((item) => (
              <button
                key={item.name}
                className={`nav-item${isActive(item.name, view.name) ? ' is-active' : ''}`}
                type="button"
                onClick={item.onClick}
              >
                {item.icon}
                <span className="nav-text">{item.label}</span>
                {item.count > 0 && <span className="nav-count">{item.count}</span>}
              </button>
            ))}
          </nav>
        </aside>

        <main className="main">{children}</main>
      </div>
    </div>
  )
}
