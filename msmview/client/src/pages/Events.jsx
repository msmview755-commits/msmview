import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const API = import.meta.env.VITE_API_URL

const CATEGORIES = ['General', 'Medical', 'Community', 'Training', 'Meeting', 'Celebration']
const CAT_COLORS  = { Medical:'#ebf8ff', Community:'#f0fff4', Training:'#faf5ff', Meeting:'#fffbeb', Celebration:'#fff5f5', General:'#f7fafc' }
const CAT_BORDER  = { Medical:'#bee3f8', Community:'#c6f6d5', Training:'#e9d8fd', Meeting:'#fefcbf', Celebration:'#fed7d7', General:'#e2e8f0' }

export default function Events() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'super_admin'
  const [events,   setEvents]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId,   setEditId]   = useState(null)
  const [form, setForm] = useState({ title:'', description:'', location:'', startTime:'', endTime:'', category:'General' })

  const load = () => axios.get(`${API}/events`).then(r => setEvents(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ title:'', description:'', location:'', startTime:'', endTime:'', category:'General' })
    setEditId(null); setShowForm(true)
  }

  const openEdit = (ev) => {
    setForm({
      title: ev.title, description: ev.description, location: ev.location,
      startTime: ev.startTime?.slice(0,16), endTime: ev.endTime?.slice(0,16),
      category: ev.category
    })
    setEditId(ev._id); setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) await axios.patch(`${API}/events/${editId}`, form)
      else        await axios.post(`${API}/events`, form)
      load(); setShowForm(false)
    } catch { alert('Error saving event') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event?')) return
    await axios.delete(`${API}/events/${id}`)
    load()
  }

  // Group events by month
  const grouped = events.reduce((acc, ev) => {
    const key = new Date(ev.startTime).toLocaleString('default', { month:'long', year:'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(ev)
    return acc
  }, {})

  if (loading) return <div className="loading">Loading events...</div>

  return (
    <div>
      <div className="flex-between mb-3">
        <div>
          <h2 style={{ fontSize:'1.2rem', fontWeight:700 }}>Event Planner</h2>
          <p className="text-sm text-muted">All upcoming and past events with timestamps.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={openNew}>+ Add Event</button>}
      </div>

      {events.length === 0 ? (
        <div className="card" style={{ textAlign:'center', padding:'4rem' }}>
          <div style={{ marginBottom:'1rem' }}><svg width="48" height="48" fill="none" stroke="var(--text-light)" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div className="fw-600 mb-1">No events yet</div>
          {isAdmin && <p className="text-sm text-muted">Click "Add Event" to create the first one.</p>}
        </div>
      ) : (
        Object.entries(grouped).map(([month, evs]) => (
          <div key={month} className="mb-3">
            <div className="text-xs fw-600 text-muted mb-2" style={{ textTransform:'uppercase', letterSpacing:'0.1em' }}>{month}</div>
            <div className="events-list">
              {evs.map(ev => {
                const d = new Date(ev.startTime)
                const end = new Date(ev.endTime)
                return (
                  <div key={ev._id} className="event-card" style={{ background: CAT_COLORS[ev.category]||'white', borderColor: CAT_BORDER[ev.category]||'var(--border)' }}>
                    <div className="event-date-block">
                      <div className="day">{d.getDate()}</div>
                      <div className="month">{d.toLocaleString('default',{month:'short'})}</div>
                    </div>
                    <div className="event-info" style={{ flex:1 }}>
                      <div className="flex-between">
                        <h3>{ev.title}</h3>
                        <div className="flex-center gap-1">
                          <span className="badge badge-complete" style={{ fontSize:'0.68rem' }}>{ev.category}</span>
                          {isAdmin && (
                            <>
                              <button className="btn btn-outline" style={{ padding:'0.2rem 0.6rem', fontSize:'0.75rem' }} onClick={() => openEdit(ev)}>Edit</button>
                              <button className="btn" style={{ padding:'0.2rem 0.6rem', fontSize:'0.75rem', background:'#fff5f5', color:'#c53030', border:'1px solid #fc8181' }} onClick={() => handleDelete(ev._id)}>Delete</button>
                            </>
                          )}
                        </div>
                      </div>
                      {ev.description && <p style={{ fontSize:'0.82rem', color:'var(--text-light)', margin:'0.3rem 0' }}>{ev.description}</p>}
                      <div className="event-meta">
                        <span><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:'middle',marginRight:2}}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} – {end.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
                        {ev.location && <span><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:'middle',marginRight:2}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> {ev.location}</span>}
                        <span><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{verticalAlign:'middle',marginRight:2}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> {ev.postedBy?.name}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editId ? 'Edit Event' : 'Add New Event'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input className="form-control" value={form.title} onChange={e => setForm({...form, title:e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select className="form-control" value={form.category} onChange={e => setForm({...form, category:e.target.value})}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Start Time</label>
                  <input className="form-control" type="datetime-local" value={form.startTime} onChange={e => setForm({...form, startTime:e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input className="form-control" type="datetime-local" value={form.endTime} onChange={e => setForm({...form, endTime:e.target.value})} required />
                </div>
              </div>
              <div className="form-group">
                <label>Location</label>
                <input className="form-control" placeholder="e.g. Community Hall, Room 2" value={form.location} onChange={e => setForm({...form, location:e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={3} value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
              </div>
              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">{editId ? 'Update Event' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
