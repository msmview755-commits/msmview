import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/',          label: 'Home',      icon: '🏠' },
  { to: '/health',    label: 'Health',    icon: '🏥' },
  { to: '/news',      label: 'News',      icon: '📰' },
  { to: '/roads',     label: 'Roads',     icon: '🛣️' },
  { to: '/inventory', label: 'Inventory', icon: '📦' },
  { to: '/events',    label: 'Events',    icon: '📅' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U'

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>MSM View</h2>
        <p>Professional Suite</p>
      </div>

      <nav className="sidebar-nav">
        {nav.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'active' : ''}>
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="user-info">
          <div className="avatar">{initials}</div>
          <div>
            <div className="uname">{user?.name?.split(' ')[0]}</div>
            <div className="urole">{user?.role}</div>
          </div>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          <span>↪</span> Logout
        </button>
      </div>
    </div>
  )
}
