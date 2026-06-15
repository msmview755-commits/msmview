import { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL

const hrData = [
  { t: '8am', v: 72 }, { t: '10am', v: 78 }, { t: '12pm', v: 85 },
  { t: '2pm', v: 80 }, { t: '4pm', v: 88 }, { t: '6pm', v: 82 }, { t: '8pm', v: 76 }
]

export default function Health() {
  const { user } = useAuth()
  const isDoctor = user?.role === 'doctor' || user?.role === 'super_admin'
  const [reports,   setReports]   = useState([])
  const [latest,    setLatest]    = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading,   setLoading]   = useState(true)
  const [form, setForm] = useState({ patientName:'', bloodPressure:'', glucose:'', heartRate:'', stressLevel:'', notes:'' })
  const [meds, setMeds] = useState([{ name:'', dosage:'', schedule:'' }])

  useEffect(() => {
    axios.get(`${API}/health`).then(r => {
      setReports(r.data)
      if (r.data.length) setLatest(r.data[0])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k,v]) => fd.append(k,v))
      fd.append('medications', JSON.stringify(meds.filter(m => m.name)))
      await axios.post(`${API}/health`, fd)
      const r = await axios.get(`${API}/health`)
      setReports(r.data); setLatest(r.data[0])
      setShowModal(false)
      setForm({ patientName:'', bloodPressure:'', glucose:'', heartRate:'', stressLevel:'', notes:'' })
    } catch(err) { alert('Error saving report') }
  }

  const now = new Date()
  const days = ['MO','TU','WE','TH','FR','SA','SU']
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).getDay()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()

  if (loading) return <div className="loading">Loading health data...</div>

  return (
    <div>
      {/* Metrics row */}
      <div className="grid-4 mb-3">
        {[
          { label: 'Blood Pressure', value: latest?.measurements?.bloodPressure || '--', unit: 'mmHg', icon: <svg width="18" height="18" fill="none" stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
          { label: 'Glucose',        value: latest?.measurements?.glucose        || '--', unit: 'mg/dL', icon: <svg width="18" height="18" fill="none" stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg> },
          { label: 'Heart Rate',     value: latest?.measurements?.heartRate      || '--', unit: 'Bpm',  icon: <svg width="18" height="18" fill="none" stroke="#e53e3e" strokeWidth="2" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> },
          { label: 'Stress Levels',  value: latest?.measurements?.stressLevel    || '--', unit: '/ 10', icon: <svg width="18" height="18" fill="none" stroke="#805ad5" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg> },
        ].map(m => (
          <div className="metric-card" key={m.label}>
            <div className="metric-label">{m.label} <span>{m.icon}</span></div>
            <div className="metric-value">{m.value}<span className="metric-unit">{m.unit}</span></div>
          </div>
        ))}
      </div>

      <div className="grid-2 mb-3" style={{ gridTemplateColumns: '1.8fr 1fr' }}>
        {/* Heart Rate Chart */}
        <div className="card">
          <div className="flex-between mb-2">
            <div>
              <div className="fw-600">Heart Rate Analysis</div>
              <div className="text-xs text-muted">Real-time trend monitoring</div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--teal)' }}>
              {latest?.measurements?.heartRate || '00'}
              <span className="text-xs text-muted" style={{ fontSize: '0.65rem' }}> LIVE VALUE</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={hrData}>
              <XAxis dataKey="t" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Line type="monotone" dataKey="v" stroke="var(--teal)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Calendar */}
        <div className="card">
          <div className="flex-between mb-2">
            <span className="fw-600" style={{ fontSize: '0.82rem' }}>
              {now.toLocaleString('default',{month:'long'}).toUpperCase()} {now.getFullYear()}
            </span>
            <span className="text-xs text-muted">‹ ›</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', fontSize: '0.7rem' }}>
            {days.map(d => <div key={d} style={{ textAlign:'center', color:'var(--text-light)', padding:'4px 0', fontWeight:600 }}>{d}</div>)}
            {Array.from({ length: (firstDay || 7) - 1 }).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_,i) => i+1).map(d => (
              <div key={d} style={{ textAlign:'center', padding:'4px 0', borderRadius:'50%', background: d === now.getDate() ? 'var(--teal)' : 'transparent', color: d === now.getDate() ? 'white' : 'var(--text-dark)', cursor:'pointer' }}>{d}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Medications */}
      {latest?.medications?.length > 0 && (
        <div className="card mb-3">
          <div className="fw-600 mb-2"><svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight:'4px',verticalAlign:'middle'}}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg> Current Medications</div>
          {latest.medications.map((m, i) => (
            <div key={i} className="flex-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
              <span>{m.name} ({m.dosage})</span>
              <span className="text-muted">{m.schedule}</span>
            </div>
          ))}
        </div>
      )}

      {/* Upload bar */}
      <div className="card flex-between" style={{ padding: '1rem 1.5rem' }}>
        <div className="flex-center gap-1">
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span className="text-sm text-muted">Last Report on {latest ? new Date(latest.createdAt).toLocaleDateString('en-GB') : 'N/A'}</span>
        </div>
        {isDoctor && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight:4}}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload New Report
          </button>
        )}
      </div>

      {/* Notes from latest */}
      {latest?.notes && (
        <div className="card mt-2">
          <div className="fw-600 mb-1 text-sm">Doctor's Notes</div>
          <p className="text-sm text-muted">{latest.notes}</p>
        </div>
      )}

      {/* Upload Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Daily Health Metrics Upload</h2>
            <p className="text-sm text-muted mb-3">Log your patient's current vital signs</p>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Patient Name</label>
                <input className="form-control" value={form.patientName} onChange={e => setForm({...form, patientName: e.target.value})} required />
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label>Blood Pressure (mmHg)</label>
                  <input className="form-control" placeholder="e.g. 120/80" value={form.bloodPressure} onChange={e => setForm({...form, bloodPressure: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Glucose (mg/dL)</label>
                  <input className="form-control" placeholder="Enter number" value={form.glucose} onChange={e => setForm({...form, glucose: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Heart Rate (BPM)</label>
                  <input className="form-control" placeholder="Enter number" value={form.heartRate} onChange={e => setForm({...form, heartRate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Stress Level (1-10)</label>
                  <input className="form-control" placeholder="Enter number" value={form.stressLevel} onChange={e => setForm({...form, stressLevel: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>Medications</label>
                {meds.map((m, i) => (
                  <div key={i} className="grid-3 mb-1">
                    <select className="form-control" value={m.name} onChange={e => { const n=[...meds]; n[i].name=e.target.value; setMeds(n) }}>
                      <option value="">Select Medication</option>
                      <option>Paracetamol</option><option>Vitamin D3</option><option>Magnesium Glycinate</option><option>Omega-3</option><option>Aspirin</option><option>Metformin</option>
                    </select>
                    <select className="form-control" value={m.dosage} onChange={e => { const n=[...meds]; n[i].dosage=e.target.value; setMeds(n) }}>
                      <option value="">Select Dosage</option>
                      <option>250mg</option><option>500mg</option><option>1000mg</option><option>1 per day</option><option>2 per day</option>
                    </select>
                    <select className="form-control" value={m.schedule} onChange={e => { const n=[...meds]; n[i].schedule=e.target.value; setMeds(n) }}>
                      <option value="">Select Schedule</option>
                      <option>Morning</option><option>Afternoon</option><option>Evening</option><option>Night</option><option>2 per day</option><option>1 at night</option>
                    </select>
                  </div>
                ))}
                <button type="button" className="btn btn-outline text-sm" onClick={() => setMeds([...meds, { name:'', dosage:'', schedule:'' }])}>+ Add Medication</button>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea className="form-control" rows={3} placeholder="Enter clinical observations..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>

              <div className="flex-between mt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Discard Entry</button>
                <button type="submit" className="btn btn-primary">Submit Health Data</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
