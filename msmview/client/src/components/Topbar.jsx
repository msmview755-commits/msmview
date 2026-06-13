import { useAuth } from '../context/AuthContext'

export default function Topbar({ title }) {
  const { user } = useAuth()
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U'
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2,'0')} ${now.toLocaleString('default',{month:'short'}).toUpperCase()}`

  return (
    <div className="topbar">
      <h1>{title}</h1>
      <div className="topbar-right">
        <span className="date-badge">{dateStr} 📅</span>
        <div className="icon-btn">🔔</div>
        <div className="avatar-circle">{initials}</div>
      </div>
    </div>
  )
}
