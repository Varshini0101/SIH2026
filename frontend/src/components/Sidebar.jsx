import { Link, useLocation } from 'react-router-dom'

export default function Sidebar() {
  const location = useLocation()
  const currentPath = location.pathname

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/complaints', label: 'Complaints' },
    { path: '/transactions', label: 'Transactions' },
    { path: '/accounts', label: 'Accounts' },
    { path: '/money-trail', label: 'Money Trail' },
    { path: '/risk-intelligence', label: 'Risk Intelligence' },
    { path: '/investigation', label: 'Investigation, Alerts & Fraud Rings' },
    { path: '/case/CMP-1001', label: 'Case Investigation', isActive: currentPath.startsWith('/case/') },
    { path: '/predictions', label: 'Predictions' },
    { path: '/map', label: 'Map Intelligence' },
  ]

  return (
    <aside className="sidebar">
      <div className="brand">CyberIntel</div>
      <nav className="nav-list">
        {navItems.map((item) => {
          const active = item.isActive !== undefined
            ? item.isActive
            : (currentPath === item.path || (currentPath === '/' && item.path === '/dashboard'))
          return (
            <Link
              key={item.path}
              className={`nav-item ${active ? 'active' : ''}`}
              to={item.path}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
