export default function Topbar({ title }) {
  const now = new Date()
  const dateStr = `${String(now.getDate()).padStart(2,'0')} ${now.toLocaleString('default',{month:'short'}).toUpperCase()}`

  return (
    <div className="topbar">
      <h1>{title}</h1>
      <div className="topbar-right">
        <span className="date-badge flex-center gap-1">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          {dateStr}
        </span>
      </div>
    </div>
  )
}
