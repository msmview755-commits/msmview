import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const nav = [
  { to: '/',          label: 'Home',      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { to: '/health',    label: 'Health',    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { to: '/news',      label: 'News',      icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><line x1="10" y1="6" x2="18" y2="6"/><line x1="10" y1="10" x2="18" y2="10"/><line x1="10" y1="14" x2="14" y2="14"/></svg> },
  { to: '/roads',     label: 'Roads',     icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg> },
  { to: '/inventory', label: 'Inventory', icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> },
  { to: '/events',    label: 'Events',    icon: <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
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
            {item.icon}
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
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Logout
        </button>
      </div>
    </div>
  )
}
