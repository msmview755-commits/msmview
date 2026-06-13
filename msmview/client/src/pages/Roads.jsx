import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import 'leaflet/dist/leaflet.css'

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const API = import.meta.env.VITE_API_URL
const CENTER = [21.1702, 72.8311] // Surat, Gujarat

const TYPE_COLORS = { traffic: '🔴', construction: '🟡', accident: '🟠', closure: '⛔', other: '🔵' }

function PinDropper({ onDrop }) {
  useMapEvents({ click: e => onDrop(e.latlng) })
  return null
}

export default function Roads() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'super_admin'
  const [incidents, setIncidents] = useState([])
  const [dropping,  setDropping]  = useState(false)
  const [showForm,  setShowForm]  = useState(false)
  const [pickedLoc, setPickedLoc] = useState(null)
  const [form, setForm] = useState({ title:'', type:'traffic', address:'', description:'' })

  useEffect(() => {
    axios.get(`${API}/roads`).then(r => setIncidents(r.data)).catch(() => {})
  }, [])

  const handleDrop = (latlng) => {
    if (!dropping) return
    setPickedLoc(latlng)
    setDropping(false)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post(`${API}/roads`, { ...form, location: { lat: pickedLoc.lat, lng: pickedLoc.lng, address: form.address } })
      const r = await axios.get(`${API}/roads`)
      setIncidents(r.data)
      setShowForm(false)
      setPickedLoc(null)
      setForm({ title:'', type:'traffic', address:'', description:'' })
    } catch { alert('Error saving incident') }
  }

  return (
    <div>
      <div className="flex-between mb-2">
        <div>
          <p className="text-sm text-muted">Live road situation — {incidents.length} active incidents</p>
        </div>
        <div className="flex-center gap-1">
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setDropping(!dropping)}>
              {dropping ? '❌ Cancel Pin' : '📍 Add Incident'}
            </button>
          )}
        </div>
      </div>

      {dropping && (
        <div style={{ background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:8, padding:'0.7rem 1rem', marginBottom:'1rem', fontSize:'0.85rem', color:'#92400e' }}>
          Click anywhere on the map to drop a pin for the incident.
        </div>
      )}

      {/* Status bar */}
      <div className="flex-center gap-2 mb-2">
        <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:20, padding:'0.35rem 1rem', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
          <span style={{ width:8, height:8, borderRadius:'50%', background:'#48bb78', display:'inline-block' }}></span>
          Main Highway: Clear
        </div>
        {incidents.filter(i => i.type === 'traffic').length > 0 && (
          <div style={{ background:'white', border:'1px solid var(--border)', borderRadius:20, padding:'0.35rem 1rem', fontSize:'0.78rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:'#fc8181', display:'inline-block' }}></span>
            {incidents.filter(i=>i.type==='traffic').length} Traffic Incident{incidents.filter(i=>i.type==='traffic').length>1?'s':''}
          </div>
        )}
      </div>

      <div className="map-wrapper" style={{ height:480 }}>
        <MapContainer center={CENTER} zoom={13} style={{ height:'100%', width:'100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          {dropping && <PinDropper onDrop={handleDrop} />}
          {incidents.map(inc => (
            <Marker key={inc._id} position={[inc.location.lat, inc.location.lng]}>
              <Popup>
                <strong>{TYPE_COLORS[inc.type]} {inc.title}</strong><br />
                {inc.description}<br />
                <small style={{ color:'#718096' }}>
                  {inc.location.address && `📍 ${inc.location.address}`}<br />
                  Added: {new Date(inc.createdAt).toLocaleDateString()}
                </small>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Incident list below map */}
      {incidents.length > 0 && (
        <div className="card mt-2">
          <div className="fw-600 mb-2">Active Incidents</div>
          {incidents.map(inc => (
            <div key={inc._id} className="flex-between" style={{ padding:'0.6rem 0', borderBottom:'1px solid var(--border)', fontSize:'0.85rem' }}>
              <div>
                <span>{TYPE_COLORS[inc.type]} </span>
                <span className="fw-600">{inc.title}</span>
                {inc.location.address && <span className="text-muted"> · {inc.location.address}</span>}
              </div>
              <span className="badge badge-pending" style={{ textTransform:'capitalize' }}>{inc.type}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add Incident Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Road Incident</h2>
            <p className="text-sm text-muted mb-3">
              Pin dropped at: {pickedLoc?.lat.toFixed(4)}, {pickedLoc?.lng.toFixed(4)}
            </p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input className="form-control" placeholder="e.g. Road construction on Main St" value={form.title} onChange={e => setForm({...form, title:e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Type</label>
                <select className="form-control" value={form.type} onChange={e => setForm({...form, type:e.target.value})}>
                  <option value="traffic">Traffic</option>
                  <option value="construction">Construction</option>
                  <option value="accident">Accident</option>
                  <option value="closure">Closure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Address (optional)</label>
                <input className="form-control" placeholder="e.g. Ring Road, Surat" value={form.address} onChange={e => setForm({...form, address:e.target.value})} />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea className="form-control" rows={2} placeholder="Brief description" value={form.description} onChange={e => setForm({...form, description:e.target.value})} />
              </div>
              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Incident</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
